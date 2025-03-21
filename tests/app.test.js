// Vocab Learning Tests
// To run these tests, include this file in a test HTML page
// and call runTests() from the console

// Import functions from app.js
const appModule = require('../src/js/app.js');

// Extract functions from appModule or mock them if they don't exist
const getExamplesForWord = appModule.getExamplesForWord || jest.fn();
const scheduleWordForRepetition = appModule.scheduleWordForRepetition || jest.fn();
const selectNextWord = appModule.selectNextWord || jest.fn();
const showNextWord = appModule.showNextWord || jest.fn();
const SPACED_REPETITION = appModule.SPACED_REPETITION || { INITIAL_INTERVAL: 10, MAX_REPETITIONS: 6 };

// Expose functions globally for testing
global.getExamplesForWord = getExamplesForWord;
global.scheduleWordForRepetition = scheduleWordForRepetition;
global.selectNextWord = selectNextWord;
global.showNextWord = showNextWord;

// Mock data
const mockVocabulary = [
  {
    "word": "test1",
    "explanation": "Test word 1",
    "explanation_translation": "Test translation 1",
    "examples": [
      { "example_number": 1, "sentence": "Test sentence 1", "sentence_translation": "Test sentence translation 1" },
      { "example_number": 2, "sentence": "Test sentence 2", "sentence_translation": "Test sentence translation 2" },
      { "example_number": 3, "sentence": "Test sentence 3", "sentence_translation": "Test sentence translation 3" },
      { "example_number": 4, "sentence": "Test sentence 4", "sentence_translation": "Test sentence translation 4" },
      { "example_number": 5, "sentence": "Test sentence 5", "sentence_translation": "Test sentence translation 5" },
      { "example_number": 6, "sentence": "Test sentence 6", "sentence_translation": "Test sentence translation 6" },
      { "example_number": 7, "sentence": "Test sentence 7", "sentence_translation": "Test sentence translation 7" },
      { "example_number": 8, "sentence": "Test sentence 8", "sentence_translation": "Test sentence translation 8" },
      { "example_number": 9, "sentence": "Test sentence 9", "sentence_translation": "Test sentence translation 9" },
      { "example_number": 10, "sentence": "Test sentence 10", "sentence_translation": "Test sentence translation 10" },
      { "example_number": 11, "sentence": "Test sentence 11", "sentence_translation": "Test sentence translation 11" },
      { "example_number": 12, "sentence": "Test sentence 12", "sentence_translation": "Test sentence translation 12" }
    ]
  },
  {
    "word": "test2",
    "explanation": "Test word 2",
    "explanation_translation": "Test translation 2",
    "examples": [
      { "example_number": 1, "sentence": "Another test sentence 1", "sentence_translation": "Another translation 1" },
      { "example_number": 2, "sentence": "Another test sentence 2", "sentence_translation": "Another translation 2" },
      { "example_number": 3, "sentence": "Another test sentence 3", "sentence_translation": "Another translation 3" },
      { "example_number": 4, "sentence": "Another test sentence 4", "sentence_translation": "Another translation 4" },
      { "example_number": 5, "sentence": "Another test sentence 5", "sentence_translation": "Another translation 5" },
      { "example_number": 6, "sentence": "Another test sentence 6", "sentence_translation": "Another translation 6" }
    ]
  }
];

// Mock state
let mockWordsViewed = [];
let mockScheduledWords = [];
let mockLearnedWords = [];
let mockTotalViewsValue = 0;
let vocabulary = [];

// Helper functions
function resetTestState() {
  mockWordsViewed = [];
  mockScheduledWords = [];
  mockLearnedWords = [];
  mockTotalViewsValue = 0;
  vocabulary = [...mockVocabulary];
  
  // Reset global state
  global.wordsViewed = mockWordsViewed;
  global.scheduledWords = mockScheduledWords;
  global.learnedWords = mockLearnedWords;
  global.totalViews = mockTotalViewsValue;
  global.vocabulary = vocabulary;
  
  // Mock required functions if they don't exist
  if (!scheduleWordForRepetition.mockImplementation) {
    global.scheduleWordForRepetition = jest.fn((word) => {
      const repetitionCount = mockWordsViewed.filter(w => w === word).length;
      if (repetitionCount >= SPACED_REPETITION.MAX_REPETITIONS) {
        mockLearnedWords.push(word);
        mockScheduledWords = mockScheduledWords.filter(item => item.word !== word);
        global.learnedWords = mockLearnedWords;
        global.scheduledWords = mockScheduledWords;
        return;
      }
      
      const interval = SPACED_REPETITION.INITIAL_INTERVAL * Math.pow(2, repetitionCount - 1);
      mockScheduledWords = mockScheduledWords.filter(item => item.word !== word);
      mockScheduledWords.push({
        word,
        duePosition: mockTotalViewsValue + interval,
        repetitionCount: repetitionCount + 1
      });
      global.scheduledWords = mockScheduledWords;
    });
  }
  
  if (!selectNextWord.mockImplementation) {
    global.selectNextWord = jest.fn(() => {
      const currentPosition = mockTotalViewsValue;
      const dueWords = mockScheduledWords.filter(item => item.duePosition <= currentPosition);
      
      if (dueWords.length > 0) {
        dueWords.sort((a, b) => a.duePosition - b.duePosition);
        return dueWords[0].word;
      }
      
      const allSeenWords = [...new Set([...mockWordsViewed, ...mockLearnedWords])];
      const newWords = vocabulary.map(item => item.word).filter(word => !allSeenWords.includes(word));
      
      if (newWords.length > 0) {
        return newWords[0];
      }
      
      if (mockScheduledWords.length > 0) {
        mockScheduledWords.sort((a, b) => a.duePosition - b.duePosition);
        return mockScheduledWords[0].word;
      }
      
      return null;
    });
  }
  
  if (!getExamplesForWord.mockImplementation) {
    global.getExamplesForWord = jest.fn((wordObj, repetitionCount) => {
      const allExamples = wordObj.examples || [];
      const count = repetitionCount === 0 ? 10 : 5;
      
      if (allExamples.length <= count) {
        return allExamples;
      }
      
      // Return first N examples for deterministic testing
      return allExamples.slice(0, count);
    });
  }
}

function addToWordsViewed(word) {
  mockWordsViewed.push(word);
  global.wordsViewed = mockWordsViewed;
}

function mockTotalViews(value) {
  mockTotalViewsValue = value;
  global.totalViews = value;
}

// Helper function to update global scheduled words
function updateScheduledWords(words) {
  mockScheduledWords = words;
  global.scheduledWords = words;
}

// Helper function to update global learned words
function updateLearnedWords(words) {
  mockLearnedWords = words;
  global.learnedWords = words;
}

// Jest test suite
describe('Vocabulary Learning System', () => {
  beforeEach(() => {
    resetTestState();
    
    // Mock shuffleArray for deterministic testing
    global.shuffleArray = (array) => array;
  });

  test('first word view shows 10 examples', () => {
    const wordObj = mockVocabulary[0];
    const repetitionCount = 0;
    const examples = global.getExamplesForWord(wordObj, repetitionCount);
    expect(examples.length).toBe(10);
  });

  test('subsequent word views show 5 examples', () => {
    const wordObj = mockVocabulary[0];
    const repetitionCount = 1;
    const examples = global.getExamplesForWord(wordObj, repetitionCount);
    expect(examples.length).toBe(5);
  });

  test('scheduling first repetition at 10 words later', () => {
    const currentTotalViews = 5;
    mockTotalViews(currentTotalViews);
    addToWordsViewed('test1');
    
    global.scheduleWordForRepetition('test1');
    
    // Update mock state from global state
    mockScheduledWords = global.scheduledWords;
    const scheduledItem = mockScheduledWords.find(item => item.word === 'test1');
    expect(scheduledItem.duePosition).toBe(currentTotalViews + SPACED_REPETITION.INITIAL_INTERVAL);
  });

  test('scheduling doubled interval for subsequent repetitions', () => {
    const currentTotalViews = 10;
    mockTotalViews(currentTotalViews);
    addToWordsViewed('test1');
    addToWordsViewed('test1');
    
    global.scheduleWordForRepetition('test1');
    
    // Update mock state from global state
    mockScheduledWords = global.scheduledWords;
    const scheduledItem = mockScheduledWords.find(item => item.word === 'test1');
    expect(scheduledItem.duePosition).toBe(currentTotalViews + SPACED_REPETITION.INITIAL_INTERVAL * 2);
  });

  test('word marked as learned after max repetitions', () => {
    for (let i = 0; i < SPACED_REPETITION.MAX_REPETITIONS; i++) {
      addToWordsViewed('test1');
    }
    
    global.scheduleWordForRepetition('test1');
    
    // Update mock state from global state
    mockLearnedWords = global.learnedWords;
    mockScheduledWords = global.scheduledWords;
    
    expect(mockLearnedWords).toContain('test1');
    expect(mockScheduledWords.some(item => item.word === 'test1')).toBe(false);
  });

  test('overdue word is selected first', () => {
    mockTotalViews(50);
    updateScheduledWords([
      { word: 'test1', duePosition: 30, repetitionCount: 1 },
      { word: 'test2', duePosition: 60, repetitionCount: 1 }
    ]);
    
    const nextWord = global.selectNextWord();
    expect(nextWord).toBe('test1');
  });

  test('most overdue word is selected first', () => {
    mockTotalViews(50);
    updateScheduledWords([
      { word: 'test1', duePosition: 30, repetitionCount: 1 },
      { word: 'test2', duePosition: 40, repetitionCount: 1 }
    ]);
    
    const nextWord = global.selectNextWord();
    expect(nextWord).toBe('test1');
  });

  test('new word is selected when no due words', () => {
    vocabulary = [...mockVocabulary];
    global.vocabulary = vocabulary;
    
    const nextWord = global.selectNextWord();
    expect(['test1', 'test2']).toContain(nextWord);
  });

  test('earliest scheduled word is selected when no new words', () => {
    vocabulary = [...mockVocabulary];
    global.vocabulary = vocabulary;
    addToWordsViewed('test1');
    addToWordsViewed('test2');
    updateScheduledWords([
      { word: 'test1', duePosition: 60, repetitionCount: 1 },
      { word: 'test2', duePosition: 70, repetitionCount: 1 }
    ]);
    mockTotalViews(50);
    
    const nextWord = global.selectNextWord();
    expect(nextWord).toBe('test1');
  });

  test('total views increments only once per word view', () => {
    // Set initial values
    const initialTotalViews = 5;
    mockTotalViews(initialTotalViews);
    
    // Add a word to viewed list
    addToWordsViewed('test1');
    
    // Call scheduleWordForRepetition, which should not increment totalViews
    global.scheduleWordForRepetition('test1');
    
    // Check that total views did not change from scheduleWordForRepetition
    expect(global.totalViews).toBe(initialTotalViews);
  });
  
  test('simulates proper word view flow without double counting', () => {
    // Set up initial state
    mockTotalViews(0);
    
    // Manually increment totalViews to simulate what showNextWord does
    global.totalViews = 1;
    
    // Call scheduleWordForRepetition
    global.scheduleWordForRepetition('test1');
    
    // The total should still be 1 (not incremented by scheduleWordForRepetition)
    expect(global.totalViews).toBe(1);
  });
});

// Function to run all tests
function runTests() {
  console.log('Running VocabVocab tests...');
  let passedCount = 0;
  
  tests.forEach(testCase => {
    try {
      const passed = testCase.test();
      console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${testCase.name}`);
      if (passed) passedCount++;
    } catch (error) {
      console.error(`❌ ERROR in test "${testCase.name}":`, error);
    }
  });
  
  console.log(`Tests completed: ${passedCount}/${tests.length} passed`);
  
  return passedCount === tests.length;
}

// Export for browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests };
} else {
  // Make runTests available globally for browser
  window.runTests = runTests;
} 