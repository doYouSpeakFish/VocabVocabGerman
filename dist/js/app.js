// Constants
const STORAGE_KEYS = {
  WORDS_VIEWED: 'vocabvocab_words_viewed',
  SCHEDULED_WORDS: 'vocabvocab_scheduled_words',
  LEARNED_WORDS: 'vocabvocab_learned_words',
  TOTAL_VIEWS: 'vocabvocab_total_views',
  DAILY_COUNT: 'vocabvocab_daily_count',
  STREAK: 'vocabvocab_streak'
};

const SPACED_REPETITION = {
  INITIAL_INTERVAL: 10, // First review after 10 other word views
  MAX_REPETITIONS: 6 // After 6 repetitions, the word is considered learned
};

const DAILY_TARGET = 50; // Daily target of words to view

// Determine if we're in a test environment
const isTest = typeof global !== 'undefined';

// State
let vocabulary = isTest ? global.vocabulary : [];
let currentWord = null;
let wordsViewed = isTest ? global.wordsViewed : [];
let scheduledWords = isTest ? global.scheduledWords : [];
let learnedWords = isTest ? global.learnedWords : [];
let totalViews = isTest ? global.totalViews : 0;

// Only initialize DOM elements if we're in a browser environment
const isBrowser = typeof window !== 'undefined';
let currentWordElement, wordStatusElement, explanationElement, 
    explanationTranslationElement, examplesContainer, nextButton, 
    totalViewsElement, learnedWordsElement;

if (isBrowser) {
  currentWordElement = document.getElementById('current-word');
  wordStatusElement = document.getElementById('word-status');
  explanationElement = document.getElementById('explanation');
  explanationTranslationElement = document.getElementById('explanation-translation');
  examplesContainer = document.getElementById('examples-container');
  nextButton = document.getElementById('next-button');
  totalViewsElement = document.getElementById('total-views');
  learnedWordsElement = document.getElementById('learned-words');
}

/**
 * Initialize the application
 */
async function initApp() {
  try {
    // Register service worker for offline support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Load vocabulary data
    await loadVocabulary();
    
    // Load user data from localStorage
    loadUserData();
    
    // Display stats
    updateStats();
    
    // Set up event listeners
    nextButton.addEventListener('click', showNextWord);
    
    // Show first word
    showNextWord();
    
  } catch (error) {
    console.error('Error initializing app:', error);
    currentWordElement.textContent = 'Error loading vocabulary';
  }
}

/**
 * Load vocabulary data from JSON file
 */
async function loadVocabulary() {
  try {
    const response = await fetch('./vocab.json');
    
    if (!response.ok) {
      throw new Error(`Failed to load vocabulary: ${response.status} ${response.statusText}`);
    }
    
    vocabulary = await response.json();
    console.log(`Loaded ${vocabulary.length} vocabulary items`);
  } catch (error) {
    console.error('Error loading vocabulary:', error);
    throw error;
  }
}

/**
 * Load user data from localStorage
 */
function loadUserData() {
  try {
    const wordsViewedJson = localStorage.getItem(STORAGE_KEYS.WORDS_VIEWED);
    const scheduledWordsJson = localStorage.getItem(STORAGE_KEYS.SCHEDULED_WORDS);
    const learnedWordsJson = localStorage.getItem(STORAGE_KEYS.LEARNED_WORDS);
    const totalViewsString = localStorage.getItem(STORAGE_KEYS.TOTAL_VIEWS);
    
    wordsViewed = wordsViewedJson ? JSON.parse(wordsViewedJson) : [];
    scheduledWords = scheduledWordsJson ? JSON.parse(scheduledWordsJson) : [];
    learnedWords = learnedWordsJson ? JSON.parse(learnedWordsJson) : [];
    totalViews = totalViewsString ? parseInt(totalViewsString, 10) : 0;
    
    console.log(`Loaded user data: ${totalViews} total views, ${learnedWords.length} learned words`);
  } catch (error) {
    console.error('Error loading user data:', error);
    // Reset data if there's an error
    wordsViewed = [];
    scheduledWords = [];
    learnedWords = [];
    totalViews = 0;
  }
}

/**
 * Save user data to localStorage
 */
function saveUserData() {
  try {
    localStorage.setItem(STORAGE_KEYS.WORDS_VIEWED, JSON.stringify(wordsViewed));
    localStorage.setItem(STORAGE_KEYS.SCHEDULED_WORDS, JSON.stringify(scheduledWords));
    localStorage.setItem(STORAGE_KEYS.LEARNED_WORDS, JSON.stringify(learnedWords));
    localStorage.setItem(STORAGE_KEYS.TOTAL_VIEWS, totalViews.toString());
  } catch (error) {
    console.error('Error saving user data:', error);
  }
}

/**
 * Update displayed statistics
 */
function updateStats() {
  totalViewsElement.textContent = `Total Views: ${totalViews}`;
  learnedWordsElement.textContent = `Learned Words: ${learnedWords.length}`;
  
  // Add streak and daily progress stats
  if (document.getElementById('daily-progress')) {
    const todayCount = getTodayWordCount();
    const streak = getCurrentStreak();
    document.getElementById('daily-progress').textContent = `Today: ${todayCount}/${DAILY_TARGET}`;
    document.getElementById('current-streak').textContent = `Streak: ${streak} days`;
  }
}

/**
 * Check if a word has been learned
 */
function isWordLearned(word) {
  return learnedWords.includes(word);
}

/**
 * Get examples for a word based on repetition count
 */
function getExamplesForWord(wordObj, repetitionCount) {
  const allExamples = wordObj.examples || [];
  const count = repetitionCount === 0 ? 10 : 5; // 10 examples for first time, 5 for reviews
  
  // If there are fewer examples than requested, return all of them
  if (allExamples.length <= count) {
    return allExamples;
  }
  
  // Return random selection of examples
  return (isTest ? global.shuffleArray : shuffleArray)([...allExamples]).slice(0, count);
}

/**
 * Get the number of repetitions for a word
 */
function getWordRepetitions(word) {
  const currentWordsViewed = isTest ? global.wordsViewed : wordsViewed;
  const currentScheduledWords = isTest ? global.scheduledWords : scheduledWords;
  
  // Count repetitions from wordsViewed
  const viewedCount = currentWordsViewed.filter(w => w === word).length;
  
  // Add any scheduled repetitions
  const scheduledItem = currentScheduledWords.find(item => item.word === word);
  const scheduledCount = scheduledItem ? scheduledItem.repetitionCount : 0;
  
  return Math.max(viewedCount, scheduledCount);
}

/**
 * Find the vocabulary object for a given word
 */
function findVocabItem(word) {
  return vocabulary.find(item => item.word === word);
}

/**
 * Show the next word based on spaced repetition algorithm
 */
function showNextWord() {
  // Increment totalViews only after the first word is displayed
  if (currentWord) {
    console.log('Before increment in showNextWord:', totalViews);
    totalViews++;
    console.log('After increment in showNextWord:', totalViews);
    wordsViewed.push(currentWord);
    
    // Update daily streak
    updateDailyStreak();
    
    // Schedule current word for next repetition if needed
    scheduleWordForRepetition(currentWord);
    
    // Save data after each word view
    saveUserData();
    updateStats();
    console.log('Final totalViews after scheduling:', totalViews);
  }
  
  // Scroll back to the top of the page
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
  
  // Determine which word to show next
  const wordToShow = selectNextWord();
  currentWord = wordToShow;
  
  if (!wordToShow) {
    // No words available (should not happen with enough vocabulary)
    currentWordElement.textContent = 'You have learned everything!';
    explanationElement.textContent = '';
    explanationTranslationElement.textContent = '';
    examplesContainer.innerHTML = '';
    return;
  }
  
  // Find the vocabulary item for the selected word
  const vocabItem = findVocabItem(wordToShow);
  
  if (!vocabItem) {
    console.error(`Vocabulary item not found for word: ${wordToShow}`);
    return;
  }
  
  // Get repetition count for this word
  const repetitionCount = getWordRepetitions(wordToShow);
  
  // Display the word and its information
  currentWordElement.textContent = vocabItem.word;
  
  // Display repetition status
  if (repetitionCount === 0) {
    wordStatusElement.textContent = 'New word';
  } else {
    wordStatusElement.textContent = `Review ${repetitionCount} of ${SPACED_REPETITION.MAX_REPETITIONS}`;
  }
  
  // Display explanation
  explanationElement.textContent = vocabItem.explanation || '';
  explanationTranslationElement.textContent = vocabItem.explanation_translation || '';
  
  // Display examples
  const examples = getExamplesForWord(vocabItem, repetitionCount);
  displayExamples(examples);
}

/**
 * Schedule a word for repetition based on its current repetition count
 */
function scheduleWordForRepetition(word) {
  console.log('scheduleWordForRepetition - totalViews before:', totalViews);
  const repetitionCount = getWordRepetitions(word);
  
  // If word has reached max repetitions, mark as learned
  if (repetitionCount >= SPACED_REPETITION.MAX_REPETITIONS) {
    if (isTest) {
      global.learnedWords.push(word);
      global.scheduledWords = global.scheduledWords.filter(item => item.word !== word);
    } else {
      learnedWords.push(word);
      scheduledWords = scheduledWords.filter(item => item.word !== word);
    }
    console.log('scheduleWordForRepetition - totalViews after (learned):', totalViews);
    return;
  }
  
  // Calculate next interval based on repetition count
  // For first repetition (repetitionCount = 0), interval = INITIAL_INTERVAL
  // For second repetition (repetitionCount = 1), interval = INITIAL_INTERVAL * 2
  // For third repetition (repetitionCount = 2), interval = INITIAL_INTERVAL * 4
  const interval = SPACED_REPETITION.INITIAL_INTERVAL * Math.pow(2, repetitionCount - 1);
  
  // Schedule the word for repetition
  const currentTotalViews = isTest ? global.totalViews : totalViews;
  const currentScheduledWords = isTest ? global.scheduledWords : scheduledWords;
  
  // Remove any existing schedule for this word
  if (isTest) {
    global.scheduledWords = currentScheduledWords.filter(item => item.word !== word);
  } else {
    scheduledWords = currentScheduledWords.filter(item => item.word !== word);
  }
  
  const scheduledItem = {
    word,
    duePosition: currentTotalViews + interval,
    repetitionCount: repetitionCount + 1
  };
  
  if (isTest) {
    global.scheduledWords.push(scheduledItem);
  } else {
    scheduledWords.push(scheduledItem);
  }
  console.log('scheduleWordForRepetition - totalViews after:', totalViews);
}

/**
 * Select the next word to show based on spaced repetition algorithm
 */
function selectNextWord() {
  // Current position is total views
  const currentPosition = isTest ? global.totalViews : totalViews;
  
  // Get the correct scheduled words array based on environment
  const currentScheduledWords = isTest ? global.scheduledWords : scheduledWords;
  const currentWordsViewed = isTest ? global.wordsViewed : wordsViewed;
  const currentLearnedWords = isTest ? global.learnedWords : learnedWords;
  const currentVocabulary = isTest ? global.vocabulary : vocabulary;
  
  // Check for due reviews
  const dueWords = currentScheduledWords.filter(item => item.duePosition <= currentPosition);
  
  if (dueWords.length > 0) {
    // Sort by due position (most overdue first)
    dueWords.sort((a, b) => a.duePosition - b.duePosition);
    return dueWords[0].word;
  }
  
  // If no due words, try to find a new word
  const allSeenWords = [...new Set([...currentWordsViewed, ...currentLearnedWords])];
  const newWords = currentVocabulary
    .map(item => item.word)
    .filter(word => !allSeenWords.includes(word));
  
  if (newWords.length > 0) {
    return newWords[0]; // In test environment, return first new word for deterministic behavior
  }
  
  // If no new words, return earliest scheduled word
  if (currentScheduledWords.length > 0) {
    currentScheduledWords.sort((a, b) => a.duePosition - b.duePosition);
    return currentScheduledWords[0].word;
  }
  
  return null;
}

/**
 * Display examples for a word
 */
function displayExamples(examples) {
  examplesContainer.innerHTML = '';
  
  examples.forEach(example => {
    const exampleElement = document.createElement('div');
    exampleElement.classList.add('example-item');
    
    const sentenceElement = document.createElement('p');
    sentenceElement.textContent = example.sentence;
    
    const translationElement = document.createElement('p');
    translationElement.classList.add('translation');
    translationElement.textContent = example.sentence_translation;
    
    exampleElement.appendChild(sentenceElement);
    exampleElement.appendChild(translationElement);
    examplesContainer.appendChild(exampleElement);
  });
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Get today's word count
 */
function getTodayWordCount() {
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const dailyCountJson = localStorage.getItem(STORAGE_KEYS.DAILY_COUNT);
  
  if (!dailyCountJson) {
    return 0;
  }
  
  const dailyCount = JSON.parse(dailyCountJson);
  
  // If the saved date is not today, return 0
  if (dailyCount.date !== todayStr) {
    return 0;
  }
  
  return dailyCount.count;
}

/**
 * Get daily target
 */
function getDailyTarget() {
  return DAILY_TARGET;
}

/**
 * Get current streak
 */
function getCurrentStreak() {
  const streakJson = localStorage.getItem(STORAGE_KEYS.STREAK);
  
  if (!streakJson) {
    return 0;
  }
  
  const streak = JSON.parse(streakJson);
  return streak.currentStreak;
}

/**
 * Get streak start date
 */
function getStreakStartDate() {
  const todayStr = new Date().toISOString().split('T')[0];
  const streakJson = localStorage.getItem(STORAGE_KEYS.STREAK);
  
  if (!streakJson) {
    // If no streak exists, return today
    return todayStr;
  }
  
  const streak = JSON.parse(streakJson);
  return streak.startDate;
}

/**
 * Update daily streak
 */
function updateDailyStreak() {
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Get existing streak data
  let streak = { currentStreak: 0, startDate: todayStr };
  const streakJson = localStorage.getItem(STORAGE_KEYS.STREAK);
  if (streakJson) {
    streak = JSON.parse(streakJson);
  }
  
  // Get existing data for daily count
  const dailyCountJson = localStorage.getItem(STORAGE_KEYS.DAILY_COUNT);
  
  if (dailyCountJson) {
    const savedDailyCount = JSON.parse(dailyCountJson);
    
    // If the saved date is today, increment count
    if (savedDailyCount.date === todayStr) {
      savedDailyCount.count += 1;
      
      // If we just reached the daily target, increment streak
      if (savedDailyCount.count === DAILY_TARGET) {
        streak.currentStreak += 1;
      }
      
      // Save updated daily count
      localStorage.setItem(STORAGE_KEYS.DAILY_COUNT, JSON.stringify(savedDailyCount));
    } else {
      // It's a new day
      const savedDate = new Date(savedDailyCount.date);
      const today = new Date(todayStr);
      const timeDiff = today.getTime() - savedDate.getTime();
      const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
      
      // Create new daily count for today
      const newDailyCount = { date: todayStr, count: 1 };
      
      // Check if we missed a day (gap > 1 day)
      if (dayDiff > 1) {
        // Missed a day, reset streak
        streak.currentStreak = 0;
        streak.startDate = todayStr;
      } else if (dayDiff === 1) {
        // Consecutive day, check if yesterday met the target
        if (savedDailyCount.count >= DAILY_TARGET) {
          // Continue streak (don't increment until today's target is met)
          // Keep current streak value
        } else {
          // Yesterday didn't meet target, reset streak
          streak.currentStreak = 0;
          streak.startDate = todayStr;
        }
      }
      
      // Save new daily count
      localStorage.setItem(STORAGE_KEYS.DAILY_COUNT, JSON.stringify(newDailyCount));
    }
  } else {
    // No previous data, start with count 1
    const newDailyCount = { date: todayStr, count: 1 };
    localStorage.setItem(STORAGE_KEYS.DAILY_COUNT, JSON.stringify(newDailyCount));
  }
  
  // Save updated streak
  localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Export for testing (will be ignored in browser)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getExamplesForWord,
    scheduleWordForRepetition,
    selectNextWord,
    showNextWord,
    SPACED_REPETITION,
    getTodayWordCount,
    updateDailyStreak,
    getDailyTarget,
    getCurrentStreak,
    getStreakStartDate,
    DAILY_TARGET
  };
} 