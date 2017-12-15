'use strict';
/* $ global */

class TriviaApi {
  constructor() {
    this.BASE_API_URL = 'https://opentdb.com';
    this.API_TOKEN_PATH = '/api_token.php';
    this.sessionToken = null;
    this.getToken();
    this.amount = null;
    this.getAmount();
    this.query = {

    }
  }

  _buildUrl(path, query) {
    const url = new URL(BASE_API_URL + path);
    const queryKeys = Object.keys(this.query);
    url.searchParams.set('amount', this.amount);
  
    if (sessionToken) {
      url.searchParams.set('token', this.sessionToken);
    }
  
    queryKeys.forEach(key => url.searchParams.set(key, query[key]));
    return url;
  }

  getToken() {}
    _buildUrl(API_TOKEN_PATH,)  
  return new URL(BASE_API_URL + );
  };
  
  const fetchToken = function(callback) {
    if (sessionToken) {
      return callback();
    }
  
    const url = buildTokenUrl();
    url.searchParams.set('command', 'request');
  
    $.getJSON(url, res => {
      sessionToken = res.token;
      callback();
    }, err => console.log(err));
  };

  getQuestions() {}

  getCategories() {}

}

const newGame = new TriviaApi();

newGame.getQuestions();

// URL Components

const TOP_LEVEL_COMPONENTS = [
  'js-intro', 'js-question', 'js-question-feedback', 
  'js-outro', 'js-quiz-status'
];

// let sessionToken;



const fetchQuestions = function(amt, query, callback) {
  $.getJSON(buildBaseUrl(amt, query), callback, err => console.log(err.message));
};

let QUESTIONS = [];

const getInitialStore = function(){
  return {
    page: 'intro',
    currentQuestionIndex: null,
    userAnswers: [],
    feedback: null,
  };
};

let store = getInitialStore();

// Helper functions
// ===============
const hideAll = function() {
  TOP_LEVEL_COMPONENTS.forEach(component => $(`.${component}`).hide());
};





const seedQuestions = function(questions) {
  QUESTIONS.length = 0;
  questions.forEach(q => QUESTIONS.push(createQuestion(q)));
};

const fetchAndSeedQuestions = function(amt, query, callback) {
  fetchQuestions(amt, query, res => {
    seedQuestions(res.results);
    callback();
  });
};

// Decorate API question object into our Quiz App question format
const createQuestion = function(question) {
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
};

const getScore = function() {
  return store.userAnswers.reduce((accumulator, userAnswer, index) => {
    const question = getQuestion(index);

    if (question.correctAnswer === userAnswer) {
      return accumulator + 1;
    } else {
      return accumulator;
    }
  }, 0);
};

const getProgress = function() {
  return {
    current: store.currentQuestionIndex + 1,
    total: QUESTIONS.length
  };
};

const getCurrentQuestion = function() {
  return QUESTIONS[store.currentQuestionIndex];
};

const getQuestion = function(index) {
  return QUESTIONS[index];
};

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

  const question = getCurrentQuestion();
  const { feedback } = store; 
  const { current, total } = getProgress();

  $('.js-score').html(`<span>Score: ${getScore()}</span>`);
  $('.js-progress').html(`<span>Question ${current} of ${total}`);

  switch (store.page) {
  case 'intro':
    if (sessionToken) {
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
  store = getInitialStore();
  store.page = 'question';
  store.currentQuestionIndex = 0;
  const quantity = parseInt($('#js-question-quantity').find(':selected').val(), 10);
  fetchAndSeedQuestions(quantity, { type: 'multiple' }, () => {
    render();
  });
};

const handleSubmitAnswer = function(e) {
  e.preventDefault();
  const question = getCurrentQuestion();
  const selected = $('input:checked').val();
  store.userAnswers.push(selected);
  
  if (selected === question.correctAnswer) {
    store.feedback = 'You got it!';
  } else {
    store.feedback = `Too bad! The correct answer was: ${question.correctAnswer}`;
  }

  store.page = 'answer';
  render();
};

const handleNextQuestion = function() {
  if (store.currentQuestionIndex === QUESTIONS.length - 1) {
    store.page = 'outro';
    render();
    return;
  }

  store.currentQuestionIndex++;
  store.page = 'question';
  render();
};

// NEED TO UPDATE CALL!

// On DOM Ready, run render() and add event listeners
$(() => {
  // Run first render
  render();
  
  // Fetch session token, re-render when complete
  fetchToken(() => {
    render();
  });

  $('.js-intro, .js-outro').on('click', '.js-start', handleStartQuiz);
  $('.js-question').on('submit', handleSubmitAnswer);
  $('.js-question-feedback').on('click', '.js-continue', handleNextQuestion);
});
