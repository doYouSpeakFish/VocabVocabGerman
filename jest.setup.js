// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock shuffle function to make tests deterministic
global.shuffleArray = (array) => array;

// Mock state variables
global.wordsViewed = [];
global.scheduledWords = [];
global.learnedWords = [];
global.totalViews = 0;
global.vocabulary = []; 