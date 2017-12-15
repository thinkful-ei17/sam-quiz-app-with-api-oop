'use strict';
/* global $ */

class TriviaApi {
  constructor(){
    this.sessionToken = null;
  }
  
  // Private Functions

  _buildTokenUrl() {
    return new URL(this.BASE_API_URL + '/api_token.php');
  }

  _fetchQuestions(amt, query, callback) {
    $.getJSON(this._buildBaseUrl(amt, query), callback, err => console.log(err.message));
  }
  
  _buildBaseUrl(amt = 10, query = {}) {
    const url = new URL(this.BASE_API_URL + '/api.php');
    const queryKeys = Object.keys(query);
    url.searchParams.set('amount', amt);
  
    if (this.sessionToken) {
      url.searchParams.set('token', this.sessionToken);
    }
  
    queryKeys.forEach(key => url.searchParams.set(key, query[key]));
    return url;
  }
  
  // Public Functions

  fetchToken(callback) {
    if (this.sessionToken) {
      return callback();
    }
  
    const url = this._buildTokenUrl();
    url.searchParams.set('command', 'request');
  
    $.getJSON(url, res => {
      this.sessionToken = res.token;
      console.log(this.sessionToken);
      callback();
    }, err => console.log(err));
  }
}

TriviaApi.prototype.BASE_API_URL = 'https://opentdb.com';

class QuestionData {
  constructor() {
    this.QUESTIONS = [];
  }
  _createQuestion(question) {
    // Copy incorrect_answers array into new all answers array
    const answers = [ ...question.incorrect_answers ];
  
    // Pick random index from total answers length (incorrect_answers length + 1 correct_answer)
    const randomIndex = Math.floor(Math.random() * (question.incorrect_answers.length + 1));
  
    // Insert correct answer at random place
    answers.splice(randomIndex, 0, question.correct_answer);
  
    return {
      text: question.question,
      correctAnswer: question.correct_answer,
      answers
    };
  }

  _seedQuestions(questions) {
    this.QUESTIONS.length = 0;
    questions.forEach(q => this.QUESTIONS.push(this._createQuestion(q)));
  }

  fetchAndSeedQuestions(amt, query, callback) {
    triviaGame._fetchQuestions(amt, query, res => {
      this._seedQuestions(res.results);
      callback();
    });
  }
}

class Store {
  constructor() {
    this.store = this._getInitialStore();
  }
  
  // Private Functions

  _getInitialStore(){
    return {
      page: 'intro',
      currentQuestionIndex: null,
      userAnswers: [],
      feedback: null,
    };
  }

  // Public Functions
  getScore() {
    return this.store.userAnswers.reduce((accumulator, userAnswer, index) => {
      const question = this.getQuestion(index);
  
      if (question.correctAnswer === userAnswer) {
        return accumulator + 1;
      } else {
        return accumulator;
      }
    }, 0);
  }
  
  getProgress() {
    return {
      current: this.store.currentQuestionIndex + 1,
      total: questionList.QUESTIONS.length
    };
  }
  
  getCurrentQuestion() {
    return questionList.QUESTIONS[this.store.currentQuestionIndex];
  }
  
  getQuestion(index) {
    return questionList.QUESTIONS[index];
  }

}

const TOP_LEVEL_COMPONENTS = [
  'js-intro', 'js-question', 'js-question-feedback', 
  'js-outro', 'js-quiz-status'
];

// Helper functions
// ===============
const hideAll = function() {
  TOP_LEVEL_COMPONENTS.forEach(component => $(`.${component}`).hide());
};



// Decorate API question object into our Quiz App question format




// HTML generator functions
// ========================
const generateAnswerItemHtml = function(answer) {
  return `
    <li class="answer-item">
      <input type="radio" name="answers" value="${answer}" />
      <span class="answer-text">${answer}</span>
    </li>
  `;
};

const generateQuestionHtml = function(question) {
  const answers = question.answers
    .map((answer, index) => generateAnswerItemHtml(answer, index))
    .join('');

  return `
    <form>
      <fieldset>
        <legend class="question-text">${question.text}</legend>
          ${answers}
          <button type="submit">Submit</button>
      </fieldset>
    </form>
  `;
};

const generateFeedbackHtml = function(feedback) {
  return `
    <p>
      ${feedback}
    </p>
    <button class="continue js-continue">Continue</button>
  `;
};

// Render function - uses `store` object to construct entire page every time it's run
// ===============
const render = function() {
  let html;
  hideAll();

  const question = quizStore.getCurrentQuestion();
  const { feedback } = quizStore.store; 
  const { current, total } = quizStore.getProgress();

  $('.js-score').html(`<span>Score: ${quizStore.getScore()}</span>`);
  $('.js-progress').html(`<span>Question ${current} of ${total}`);

  switch (quizStore.store.page) {
  case 'intro':
    if (triviaGame.sessionToken) {
      $('.js-start').attr('disabled', false);
    }
  
    $('.js-intro').show();
    break;
    
  case 'question':
    html = generateQuestionHtml(question);
    $('.js-question').html(html);
    $('.js-question').show();
    $('.quiz-status').show();
    break;

  case 'answer':
    html = generateFeedbackHtml(feedback);
    $('.js-question-feedback').html(html);
    $('.js-question-feedback').show();
    $('.quiz-status').show();
    break;

  case 'outro':
    $('.js-outro').show();
    $('.quiz-status').show();
    break;

  default:
    return;
  }
};

// Event handler functions
// =======================
const handleStartQuiz = function() {
  quizStore.store.page = 'question';
  quizStore.store.currentQuestionIndex = 0;
  const quantity = parseInt($('#js-question-quantity').find(':selected').val(), 10);
  questionList.fetchAndSeedQuestions(quantity, { type: 'multiple' }, () => {
    render();
  });
};

const handleSubmitAnswer = function(e) {
  e.preventDefault();
  const question = quizStore.getCurrentQuestion();
  const selected = $('input:checked').val();
  quizStore.store.userAnswers.push(selected);
  
  if (selected === question.correctAnswer) {
    quizStore.store.feedback = 'You got it!';
  } else {
    quizStore.store.feedback = `Too bad! The correct answer was: ${question.correctAnswer}`;
  }

  quizStore.store.page = 'answer';
  render();
};

const handleNextQuestion = function() {
  if (quizStore.store.currentQuestionIndex === questionList.QUESTIONS.length - 1) {
    quizStore.store.page = 'outro';
    render();
    return;
  }

  quizStore.store.currentQuestionIndex++;
  quizStore.store.page = 'question';
  render();
};

const triviaGame = new TriviaApi();
const questionList = new QuestionData();
const quizStore = new Store();
// On DOM Ready, run render() and add event listeners
$(() => {
  // Run first render
  render();
  
  // Fetch session token, re-render when complete
  triviaGame.fetchToken(() => {
    render();
  });

  $('.js-intro, .js-outro').on('click', '.js-start', handleStartQuiz);
  $('.js-question').on('submit', handleSubmitAnswer);
  $('.js-question-feedback').on('click', '.js-continue', handleNextQuestion);
});
