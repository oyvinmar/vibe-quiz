"use client";
import React, { useState, useEffect } from "react";
import Confetti from "react-confetti";
import useSound from "use-sound";

// Emoji sets for visual counting
const EMOJI_SETS = ["🍎", "🌟", "🎈", "🐱", "🌸", "🍕", "🚀", "🎁", "🐶", "🦋"];

type ExerciseType = "standard" | "missingNumber" | "visual" | "multipleChoice" | "threeNumbers" | "comparison" | "money" | "makeTarget" | "balance" | "clock";

// Norwegian kroner for money problems
const COINS = [
  { value: 1, emoji: "🥉", label: "1 kr" },
  { value: 5, emoji: "🔵", label: "5 kr" },
  { value: 10, emoji: "🥈", label: "10 kr" },
  { value: 20, emoji: "🥇", label: "20 kr" },
];

interface Exercise {
  id: string;
  type: ExerciseType;
  a: number;
  b: number;
  op: string;
  answer: number;
  // For three number exercises
  c?: number;
  op2?: string;
  // For missing number: which position is missing (0=first, 1=second, 2=result)
  missingPosition?: number;
  // For visual counting
  emoji?: string;
  // For multiple choice
  choices?: number[];
  // For comparison: second expression
  a2?: number;
  b2?: number;
  op2Compare?: string;
  answer2?: number;
  // For money problems
  coins?: { value: number; emoji: string; label: string; count: number }[];
  // For make target
  targetNumber?: number;
  numberOptions?: number[];
  correctPair?: [number, number];
  // For balance
  leftA?: number;
  leftB?: number;
  rightA?: number;
  rightB?: number;
  // For clock
  clockHour?: number;
  clockMinutes?: number;
  timeOptions?: string[];
}

// Generate wrong answers that are close to the correct one
function generateWrongAnswers(correct: number, count: number): number[] {
  const wrongs: Set<number> = new Set();
  const offsets = [-3, -2, -1, 1, 2, 3, -5, 5, -10, 10];

  while (wrongs.size < count) {
    const offset = offsets[Math.floor(Math.random() * offsets.length)];
    const wrong = correct + offset;
    if (wrong >= 0 && wrong !== correct && !wrongs.has(wrong)) {
      wrongs.add(wrong);
    }
  }
  return Array.from(wrongs);
}

// Shuffle array
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Helper to generate a single exercise
function generateExercise(id: string): Exercise {
  const typeRand = Math.random();
  let type: ExerciseType;

  // 10 types, roughly equal distribution
  if (typeRand < 0.1) {
    type = "standard";
  } else if (typeRand < 0.2) {
    type = "missingNumber";
  } else if (typeRand < 0.3) {
    type = "visual";
  } else if (typeRand < 0.4) {
    type = "multipleChoice";
  } else if (typeRand < 0.5) {
    type = "threeNumbers";
  } else if (typeRand < 0.6) {
    type = "comparison";
  } else if (typeRand < 0.7) {
    type = "money";
  } else if (typeRand < 0.8) {
    type = "makeTarget";
  } else if (typeRand < 0.9) {
    type = "balance";
  } else {
    type = "clock";
  }

  const opRand = Math.random();
  let op: string;
  let a: number;
  let b: number;
  let answer: number;

  // Visual counting uses smaller numbers
  if (type === "visual") {
    op = Math.random() < 0.5 ? "+" : "-";
    a = Math.floor(Math.random() * 8) + 1; // 1-8
    b = Math.floor(Math.random() * 6) + 1; // 1-6
    if (op === "-" && a < b) [a, b] = [b, a];
    answer = op === "+" ? a + b : a - b;

    return {
      id,
      type,
      a,
      b,
      op,
      answer,
      emoji: EMOJI_SETS[Math.floor(Math.random() * EMOJI_SETS.length)],
    };
  }

  // Three number exercises (e.g., 10 + 3 + 20)
  if (type === "threeNumbers") {
    const a = Math.floor(Math.random() * 31); // 0-30
    const b = Math.floor(Math.random() * 21); // 0-20
    const c = Math.floor(Math.random() * 31); // 0-30
    const op = Math.random() < 0.5 ? "+" : "-";
    const op2 = Math.random() < 0.5 ? "+" : "-";

    // Calculate answer step by step
    let result = a;
    result = op === "+" ? result + b : result - b;
    result = op2 === "+" ? result + c : result - c;

    // If result is negative, make it all addition
    if (result < 0) {
      return {
        id,
        type,
        a,
        b,
        c,
        op: "+",
        op2: "+",
        answer: a + b + c,
      };
    }

    return {
      id,
      type,
      a,
      b,
      c,
      op,
      op2,
      answer: result,
    };
  }

  // Comparison: which expression is bigger?
  if (type === "comparison") {
    const a1 = Math.floor(Math.random() * 30) + 5;
    const b1 = Math.floor(Math.random() * 25) + 1;
    const a2 = Math.floor(Math.random() * 30) + 5;
    const b2 = Math.floor(Math.random() * 25) + 1;
    const op1 = Math.random() < 0.6 ? "+" : "-";
    const op2c = Math.random() < 0.6 ? "+" : "-";

    let result1 = op1 === "+" ? a1 + b1 : a1 - b1;
    let result2 = op2c === "+" ? a2 + b2 : a2 - b2;

    // Ensure no negative results
    const finalA1 = op1 === "-" && a1 < b1 ? b1 : a1;
    const finalB1 = op1 === "-" && a1 < b1 ? a1 : b1;
    const finalA2 = op2c === "-" && a2 < b2 ? b2 : a2;
    const finalB2 = op2c === "-" && a2 < b2 ? a2 : b2;

    result1 = op1 === "+" ? finalA1 + finalB1 : finalA1 - finalB1;
    result2 = op2c === "+" ? finalA2 + finalB2 : finalA2 - finalB2;

    // answer: 1 = left is bigger, 2 = right is bigger, 0 = equal
    const answer = result1 > result2 ? 1 : result1 < result2 ? 2 : 0;

    return {
      id,
      type,
      a: finalA1,
      b: finalB1,
      op: op1,
      answer,
      a2: finalA2,
      b2: finalB2,
      op2Compare: op2c,
      answer2: result2,
    };
  }

  // Money: count the coins (simplified - only 1-2 coin types, fewer coins)
  if (type === "money") {
    const selectedCoins: { value: number; emoji: string; label: string; count: number }[] = [];
    let total = 0;

    // Use only 1-2 coin types with 1-3 coins each
    const numTypes = Math.floor(Math.random() * 2) + 1; // 1-2 types
    const shuffledCoins = shuffle([...COINS]);

    for (let i = 0; i < numTypes; i++) {
      const coin = shuffledCoins[i];
      const count = Math.floor(Math.random() * 3) + 1; // 1-3 of each
      selectedCoins.push({ ...coin, count });
      total += coin.value * count;
    }

    return {
      id,
      type,
      a: 0,
      b: 0,
      op: "+",
      answer: total,
      coins: selectedCoins,
    };
  }

  // Make Target: find two numbers that add to target
  if (type === "makeTarget") {
    const target = Math.floor(Math.random() * 41) + 10; // 10-50
    const correctA = Math.floor(Math.random() * (target - 2)) + 1;
    const correctB = target - correctA;

    // Generate wrong options that don't add up to target
    const options = new Set<number>([correctA, correctB]);
    while (options.size < 6) {
      const wrongNum = Math.floor(Math.random() * 40) + 1;
      // Make sure this number + any existing number doesn't equal target
      let valid = true;
      for (const existing of options) {
        if (existing + wrongNum === target) {
          valid = false;
          break;
        }
      }
      if (valid && wrongNum !== correctA && wrongNum !== correctB) {
        options.add(wrongNum);
      }
    }

    return {
      id,
      type,
      a: 0,
      b: 0,
      op: "+",
      answer: target,
      targetNumber: target,
      numberOptions: shuffle(Array.from(options)),
      correctPair: [correctA, correctB],
    };
  }

  // Balance: make both sides equal (leftA + ? = rightA + rightB)
  if (type === "balance") {
    const rightA = Math.floor(Math.random() * 20) + 5;
    const rightB = Math.floor(Math.random() * 20) + 1;
    const rightTotal = rightA + rightB;

    const leftA = Math.floor(Math.random() * (rightTotal - 1)) + 1;
    const missingValue = rightTotal - leftA;

    return {
      id,
      type,
      a: leftA,
      b: missingValue,
      op: "+",
      answer: missingValue,
      leftA,
      leftB: missingValue,
      rightA,
      rightB,
    };
  }

  // Clock: what time is it? (whole, half, quarter past, quarter to)
  if (type === "clock") {
    const hour = Math.floor(Math.random() * 12) + 1; // 1-12
    const minuteOptions = [0, 15, 30, 45];
    const minutes = minuteOptions[Math.floor(Math.random() * minuteOptions.length)];

    // Format correct answer as string for comparison
    const correctTime = `${hour}:${minutes.toString().padStart(2, '0')}`;

    // Generate wrong time options
    const allOptions = new Set<string>([correctTime]);
    while (allOptions.size < 4) {
      const wrongHour = Math.floor(Math.random() * 12) + 1;
      const wrongMinutes = minuteOptions[Math.floor(Math.random() * minuteOptions.length)];
      const wrongTime = `${wrongHour}:${wrongMinutes.toString().padStart(2, '0')}`;
      if (wrongTime !== correctTime) {
        allOptions.add(wrongTime);
      }
    }

    return {
      id,
      type,
      a: hour,
      b: minutes,
      op: ":",
      answer: hour * 100 + minutes, // encode as number for comparison
      clockHour: hour,
      clockMinutes: minutes,
      timeOptions: shuffle(Array.from(allOptions)),
    };
  }

  // Other types use addition and subtraction only
  if (opRand < 0.5) {
    op = "+";
    a = Math.floor(Math.random() * 51);
    b = Math.floor(Math.random() * 51);
    answer = a + b;
  } else {
    op = "-";
    a = Math.floor(Math.random() * 51);
    b = Math.floor(Math.random() * 51);
    if (a < b) [a, b] = [b, a];
    answer = a - b;
  }

  const base: Exercise = { id, type, a, b, op, answer };

  if (type === "missingNumber") {
    // 0 = first number missing, 1 = second number missing, 2 = result missing (like standard)
    base.missingPosition = Math.floor(Math.random() * 3);
  }

  if (type === "multipleChoice") {
    const wrongAnswers = generateWrongAnswers(answer, 3);
    base.choices = shuffle([answer, ...wrongAnswers]);
  }

  return base;
}

function generateExercises(n = 5): Exercise[] {
  return Array.from({ length: n }, (_, i) => generateExercise(`${Date.now()}-${i}-${Math.random()}`));
}

// Custom hook to get window size
function useWindowSize() {
  const [size, setSize] = React.useState([0, 0]);
  React.useEffect(() => {
    function updateSize() {
      setSize([window.innerWidth, window.innerHeight]);
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);
  return size;
}

// Streak display component
function StreakDisplay({ streak, showBonus }: { streak: number; showBonus: boolean }) {
  if (streak < 2) return null;

  return (
    <div className={`flex items-center gap-2 ${showBonus ? 'animate-pulse' : ''}`}>
      <span className="text-2xl">🔥</span>
      <span className="font-bold text-orange-600">{streak} på rad!</span>
      {streak >= 3 && <span className="text-yellow-500 font-bold">+{streak} bonus!</span>}
    </div>
  );
}

export default function MathQuiz() {
  const EXERCISE_COUNT = 5;
  const [quizKey, setQuizKey] = useState(() => `${Date.now()}-${Math.random()}`);
  const [exercises, setExercises] = useState<Exercise[]>(() => generateExercises(EXERCISE_COUNT));
  const [inputs, setInputs] = useState<string[]>(Array(EXERCISE_COUNT).fill(""));
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answered, setAnswered] = useState<boolean[]>(Array(EXERCISE_COUNT).fill(false));
  const [correct, setCorrect] = useState<boolean[]>(Array(EXERCISE_COUNT).fill(false));
  const [streak, setStreak] = useState(0);
  const [showStreakBonus, setShowStreakBonus] = useState(false);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [width, height] = useWindowSize();
  const [playCelebration] = useSound("/celebration.wav", { volume: 0.5 });

  const allCorrect = correct.every(c => c) && quizComplete;

  // Play sound when all correct
  useEffect(() => {
    if (allCorrect) {
      playCelebration();
    }
  }, [allCorrect, playCelebration]);

  const handleInput = (value: string) => {
    if (/^\d{0,3}$/.test(value)) {
      const newInputs = [...inputs];
      newInputs[currentQuestion] = value;
      setInputs(newInputs);
    }
  };

  const submitAnswer = (selectedAnswer?: number) => {
    const ex = exercises[currentQuestion];
    const userAnswer = selectedAnswer !== undefined ? selectedAnswer : parseInt(inputs[currentQuestion]);

    // Determine correct answer based on exercise type
    let correctAnswer: number;
    if (ex.type === "missingNumber" && ex.missingPosition !== undefined) {
      if (ex.missingPosition === 0) correctAnswer = ex.a;
      else if (ex.missingPosition === 1) correctAnswer = ex.b;
      else correctAnswer = ex.answer;
    } else {
      correctAnswer = ex.answer;
    }

    const isCorrect = userAnswer === correctAnswer;

    const newAnswered = [...answered];
    newAnswered[currentQuestion] = true;
    setAnswered(newAnswered);

    const newCorrect = [...correct];
    newCorrect[currentQuestion] = isCorrect;
    setCorrect(newCorrect);

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      const bonus = newStreak >= 3 ? newStreak : 0;
      const points = 1 + bonus;
      setScore(prev => prev + points);
      setTotalScore(prev => prev + points);

      if (newStreak >= 3) {
        setShowStreakBonus(true);
        setTimeout(() => setShowStreakBonus(false), 1000);
      }
    } else {
      setStreak(0);
    }

    // Move to next question or complete quiz
    setTimeout(() => {
      if (currentQuestion < EXERCISE_COUNT - 1) {
        setCurrentQuestion(prev => prev + 1);
      } else {
        setQuizComplete(true);
      }
    }, 800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputs[currentQuestion] !== "") {
      submitAnswer();
    }
  };

  const handleReset = () => {
    const newKey = `${Date.now()}-${Math.random()}`;
    setQuizKey(newKey);
    const newExercises = generateExercises(EXERCISE_COUNT);
    setExercises(newExercises);
    setInputs(Array(EXERCISE_COUNT).fill(""));
    setCurrentQuestion(0);
    setAnswered(Array(EXERCISE_COUNT).fill(false));
    setCorrect(Array(EXERCISE_COUNT).fill(false));
    setStreak(0);
    setScore(0);
    setQuizComplete(false);
    setSelectedNumbers([]);
  };

  const ex = exercises[currentQuestion];

  // Render visual counting question
  const renderVisualQuestion = () => {
    const emoji = ex.emoji || "🍎";
    const firstGroup = Array(ex.a).fill(emoji).join("");
    const secondGroup = Array(ex.b).fill(emoji).join("");

    return (
      <div className="text-center space-y-4">
        <div className="text-4xl leading-relaxed">
          <span className="inline-block p-2 bg-blue-50 rounded-xl">{firstGroup}</span>
          <span className="mx-4 text-3xl font-bold text-gray-700">{ex.op}</span>
          <span className="inline-block p-2 bg-pink-50 rounded-xl">{secondGroup}</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl font-bold text-gray-600">=</span>
          <input
            type="text"
            inputMode="numeric"
            className="border-2 border-green-400 rounded-xl px-4 py-2 w-20 text-center text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-green-200 bg-green-50"
            value={inputs[currentQuestion]}
            onChange={e => handleInput(e.target.value)}
            autoFocus
          />
        </div>
      </div>
    );
  };

  // Render missing number question
  const renderMissingNumberQuestion = () => {
    const pos = ex.missingPosition ?? 2;

    return (
      <div className="flex items-center justify-center gap-2 text-3xl font-mono">
        {pos === 0 ? (
          <input
            type="text"
            inputMode="numeric"
            className="border-2 border-purple-400 rounded-xl px-4 py-2 w-20 text-center text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-purple-200 bg-purple-50"
            value={inputs[currentQuestion]}
            onChange={e => handleInput(e.target.value)}
            autoFocus
          />
        ) : (
          <span className="text-gray-800">{ex.a}</span>
        )}
        <span className="text-gray-600 mx-1">{ex.op}</span>
        {pos === 1 ? (
          <input
            type="text"
            inputMode="numeric"
            className="border-2 border-purple-400 rounded-xl px-4 py-2 w-20 text-center text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-purple-200 bg-purple-50"
            value={inputs[currentQuestion]}
            onChange={e => handleInput(e.target.value)}
            autoFocus
          />
        ) : (
          <span className="text-gray-800">{ex.b}</span>
        )}
        <span className="text-gray-600 mx-1">=</span>
        {pos === 2 ? (
          <input
            type="text"
            inputMode="numeric"
            className="border-2 border-purple-400 rounded-xl px-4 py-2 w-20 text-center text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-purple-200 bg-purple-50"
            value={inputs[currentQuestion]}
            onChange={e => handleInput(e.target.value)}
            autoFocus
          />
        ) : (
          <span className="text-gray-800">{ex.answer}</span>
        )}
      </div>
    );
  };

  // Render multiple choice question
  const renderMultipleChoiceQuestion = () => {
    return (
      <div className="space-y-6">
        <div className="text-3xl font-mono text-center text-gray-800">
          {ex.a} {ex.op} {ex.b} = ?
        </div>
        <div className="grid grid-cols-2 gap-4">
          {ex.choices?.map((choice, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => submitAnswer(choice)}
              disabled={answered[currentQuestion]}
              className={`p-4 text-2xl font-bold rounded-2xl border-3 transition-all duration-200
                ${answered[currentQuestion]
                  ? choice === ex.answer
                    ? 'bg-green-100 border-green-500 text-green-700'
                    : inputs[currentQuestion] === String(choice)
                      ? 'bg-red-100 border-red-500 text-red-700'
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                  : 'bg-white border-blue-300 hover:border-pink-400 hover:bg-pink-50 text-gray-800 shadow-md hover:shadow-lg'
                }`}
            >
              {choice}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Render standard question
  const renderStandardQuestion = () => {
    return (
      <div className="flex items-center justify-center gap-2 text-3xl font-mono">
        <span className="text-gray-800">{ex.a}</span>
        <span className="text-gray-600 mx-1">{ex.op}</span>
        <span className="text-gray-800">{ex.b}</span>
        <span className="text-gray-600 mx-1">=</span>
        <input
          type="text"
          inputMode="numeric"
          className="border-2 border-blue-400 rounded-xl px-4 py-2 w-24 text-center text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-pink-200 bg-white"
          value={inputs[currentQuestion]}
          onChange={e => handleInput(e.target.value)}
          autoFocus
        />
      </div>
    );
  };

  // Render three numbers question
  const renderThreeNumbersQuestion = () => {
    return (
      <div className="flex items-center justify-center gap-2 text-3xl font-mono flex-wrap">
        <span className="text-gray-800">{ex.a}</span>
        <span className="text-gray-600 mx-1">{ex.op}</span>
        <span className="text-gray-800">{ex.b}</span>
        <span className="text-gray-600 mx-1">{ex.op2}</span>
        <span className="text-gray-800">{ex.c}</span>
        <span className="text-gray-600 mx-1">=</span>
        <input
          type="text"
          inputMode="numeric"
          className="border-2 border-orange-400 rounded-xl px-4 py-2 w-24 text-center text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-orange-200 bg-orange-50"
          value={inputs[currentQuestion]}
          onChange={e => handleInput(e.target.value)}
          autoFocus
        />
      </div>
    );
  };

  // Render comparison question
  const renderComparisonQuestion = () => {
    const leftResult = ex.op === "+" ? ex.a + ex.b : ex.a - ex.b;
    const rightResult = ex.op2Compare === "+" ? (ex.a2 || 0) + (ex.b2 || 0) : (ex.a2 || 0) - (ex.b2 || 0);

    return (
      <div className="space-y-6">
        <div className="text-xl font-semibold text-center text-gray-700">Hvilken er størst?</div>
        <div className="flex justify-center items-center gap-4 flex-wrap">
          <button
            type="button"
            onClick={() => submitAnswer(1)}
            disabled={answered[currentQuestion]}
            className={`p-6 text-2xl font-bold rounded-2xl border-3 transition-all duration-200 min-w-[140px]
              ${answered[currentQuestion]
                ? ex.answer === 1
                  ? 'bg-green-100 border-green-500 text-green-700 ring-4 ring-green-300'
                  : leftResult >= rightResult
                    ? 'bg-yellow-100 border-yellow-500 text-yellow-700'
                    : 'bg-red-100 border-red-400 text-red-700'
                : 'bg-white border-blue-300 hover:border-pink-400 hover:bg-pink-50 text-gray-800 shadow-md hover:shadow-lg'
              }`}
          >
            {ex.a} {ex.op} {ex.b}
          </button>
          <span className="text-2xl text-gray-400">vs</span>
          <button
            type="button"
            onClick={() => submitAnswer(2)}
            disabled={answered[currentQuestion]}
            className={`p-6 text-2xl font-bold rounded-2xl border-3 transition-all duration-200 min-w-[140px]
              ${answered[currentQuestion]
                ? ex.answer === 2
                  ? 'bg-green-100 border-green-500 text-green-700 ring-4 ring-green-300'
                  : rightResult >= leftResult
                    ? 'bg-yellow-100 border-yellow-500 text-yellow-700'
                    : 'bg-red-100 border-red-400 text-red-700'
                : 'bg-white border-blue-300 hover:border-pink-400 hover:bg-pink-50 text-gray-800 shadow-md hover:shadow-lg'
              }`}
          >
            {ex.a2} {ex.op2Compare} {ex.b2}
          </button>
        </div>
        {ex.answer === 0 && !answered[currentQuestion] && (
          <button
            type="button"
            onClick={() => submitAnswer(0)}
            className="mx-auto block px-6 py-2 text-lg font-semibold rounded-xl border-2 border-gray-300 hover:border-purple-400 hover:bg-purple-50 text-gray-600"
          >
            De er like!
          </button>
        )}
      </div>
    );
  };

  // Render money question
  const renderMoneyQuestion = () => {
    return (
      <div className="space-y-6">
        <div className="text-xl font-semibold text-center text-gray-700">Hvor mye penger er dette?</div>
        <div className="flex justify-center gap-4 flex-wrap">
          {ex.coins?.map((coin, idx) => (
            <div key={idx} className="flex flex-col items-center bg-gray-50 rounded-xl p-3 shadow">
              <span className="text-3xl">{coin.emoji}</span>
              <span className="text-sm font-medium text-gray-600">{coin.label}</span>
              <span className="text-lg font-bold text-gray-800">×{coin.count}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            className="border-2 border-green-400 rounded-xl px-4 py-2 w-24 text-center text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-green-200 bg-green-50"
            value={inputs[currentQuestion]}
            onChange={e => handleInput(e.target.value)}
            autoFocus
          />
          <span className="text-xl font-bold text-gray-600">kr</span>
        </div>
      </div>
    );
  };

  // Render make target question
  const handleNumberSelect = (num: number) => {
    if (answered[currentQuestion]) return;

    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num));
    } else if (selectedNumbers.length < 2) {
      const newSelected = [...selectedNumbers, num];
      setSelectedNumbers(newSelected);

      // Auto-submit when 2 numbers selected
      if (newSelected.length === 2) {
        const sum = newSelected[0] + newSelected[1];
        setTimeout(() => {
          submitAnswer(sum);
          setSelectedNumbers([]);
        }, 300);
      }
    }
  };

  const renderMakeTargetQuestion = () => {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <span className="text-xl font-semibold text-gray-700">Velg to tall som blir </span>
          <span className="text-3xl font-bold text-purple-600">{ex.targetNumber}</span>
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
          {ex.numberOptions?.map((num, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleNumberSelect(num)}
              disabled={answered[currentQuestion]}
              className={`p-4 text-2xl font-bold rounded-xl border-2 transition-all duration-200
                ${selectedNumbers.includes(num)
                  ? 'bg-purple-200 border-purple-500 text-purple-800 scale-110'
                  : answered[currentQuestion]
                    ? ex.correctPair?.includes(num)
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                    : 'bg-white border-gray-300 hover:border-purple-400 hover:bg-purple-50 text-gray-800'
                }`}
            >
              {num}
            </button>
          ))}
        </div>
        {selectedNumbers.length > 0 && !answered[currentQuestion] && (
          <div className="text-center text-lg text-purple-600 font-semibold">
            {selectedNumbers.join(" + ")} = {selectedNumbers.reduce((a, b) => a + b, 0)}
          </div>
        )}
      </div>
    );
  };

  // Render balance question
  const renderBalanceQuestion = () => {
    return (
      <div className="space-y-6">
        <div className="text-xl font-semibold text-center text-gray-700">Balanser vekten!</div>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-2xl font-mono bg-blue-50 rounded-xl p-4">
            <span className="text-gray-800">{ex.leftA}</span>
            <span className="text-gray-600">+</span>
            <input
              type="text"
              inputMode="numeric"
              className="border-2 border-blue-400 rounded-xl px-2 py-1 w-16 text-center text-xl font-bold focus:outline-none focus:ring-4 focus:ring-blue-200 bg-white"
              value={inputs[currentQuestion]}
              onChange={e => handleInput(e.target.value)}
              autoFocus
            />
          </div>
          <span className="text-3xl">⚖️</span>
          <div className="flex items-center gap-2 text-2xl font-mono bg-pink-50 rounded-xl p-4">
            <span className="text-gray-800">{ex.rightA}</span>
            <span className="text-gray-600">+</span>
            <span className="text-gray-800">{ex.rightB}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render clock question with analog clock SVG
  const renderClockQuestion = () => {
    const hour = ex.clockHour || 12;
    const minutes = ex.clockMinutes || 0;

    // Calculate hand angles
    // Hour hand: 30 degrees per hour + 0.5 degrees per minute
    const hourAngle = (hour % 12) * 30 + minutes * 0.5;
    // Minute hand: 6 degrees per minute
    const minuteAngle = minutes * 6;

    return (
      <div className="space-y-6">
        <div className="text-xl font-semibold text-center text-gray-700">Hva er klokka?</div>

        {/* Analog Clock SVG */}
        <div className="flex justify-center">
          <svg width="180" height="180" viewBox="0 0 200 200" className="drop-shadow-lg">
            {/* Clock face */}
            <circle cx="100" cy="100" r="95" fill="white" stroke="#3B82F6" strokeWidth="4" />

            {/* Hour markers */}
            {[...Array(12)].map((_, i) => {
              const angle = (i * 30 - 90) * (Math.PI / 180);
              const x1 = 100 + 75 * Math.cos(angle);
              const y1 = 100 + 75 * Math.sin(angle);
              const x2 = 100 + 85 * Math.cos(angle);
              const y2 = 100 + 85 * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#374151"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Hour numbers */}
            {[...Array(12)].map((_, i) => {
              const num = i === 0 ? 12 : i;
              const angle = (i * 30 - 90) * (Math.PI / 180);
              const x = 100 + 62 * Math.cos(angle);
              const y = 100 + 62 * Math.sin(angle);
              return (
                <text
                  key={i}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-lg font-bold fill-gray-700"
                  style={{ fontSize: '16px' }}
                >
                  {num}
                </text>
              );
            })}

            {/* Hour hand */}
            <line
              x1="100"
              y1="100"
              x2={100 + 45 * Math.cos((hourAngle - 90) * (Math.PI / 180))}
              y2={100 + 45 * Math.sin((hourAngle - 90) * (Math.PI / 180))}
              stroke="#1F2937"
              strokeWidth="6"
              strokeLinecap="round"
            />

            {/* Minute hand */}
            <line
              x1="100"
              y1="100"
              x2={100 + 65 * Math.cos((minuteAngle - 90) * (Math.PI / 180))}
              y2={100 + 65 * Math.sin((minuteAngle - 90) * (Math.PI / 180))}
              stroke="#3B82F6"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Center dot */}
            <circle cx="100" cy="100" r="6" fill="#1F2937" />
          </svg>
        </div>

        {/* Time options */}
        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
          {ex.timeOptions?.map((time, idx) => {
            const [h, m] = time.split(':').map(Number);
            const timeValue = h * 100 + m;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => submitAnswer(timeValue)}
                disabled={answered[currentQuestion]}
                className={`p-4 text-xl font-bold rounded-xl border-2 transition-all duration-200
                  ${answered[currentQuestion]
                    ? timeValue === ex.answer
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                    : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-800'
                  }`}
              >
                {time}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Get question type label
  const getTypeLabel = () => {
    switch (ex.type) {
      case "visual": return "🎨 Tell objektene!";
      case "missingNumber": return "🧩 Finn det manglende tallet!";
      case "multipleChoice": return "🎯 Velg riktig svar!";
      case "threeNumbers": return "🔢 Løs regnestykket!";
      case "comparison": return "⚔️ Hvilken er størst?";
      case "money": return "💰 Tell pengene!";
      case "clock": return "🕐 Hva er klokka?";
      case "makeTarget": return "🎯 Finn to tall som blir...";
      case "balance": return "⚖️ Balanser vekten!";
      default: return "📝 Løs oppgaven!";
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-200 via-pink-100 to-yellow-100 p-2 sm:p-4">
      {allCorrect && (
        <Confetti width={width} height={height} numberOfPieces={350} recycle={false} />
      )}

      <div className="bg-white rounded-3xl shadow-2xl p-4 sm:p-8 w-full max-w-lg sm:max-w-2xl border-4 border-blue-100 mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-4 text-center text-blue-700 flex items-center justify-center gap-2">
          <span>⭐️</span> Matte Quiz <span>⭐️</span>
        </h1>

        {/* Score bar */}
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="bg-yellow-100 rounded-xl px-4 py-2 shadow">
            <span className="font-semibold text-yellow-700">Totalt: {totalScore}</span>
          </div>
          <StreakDisplay streak={streak} showBonus={showStreakBonus} />
          <div className="bg-blue-100 rounded-xl px-4 py-2 shadow">
            <span className="font-semibold text-blue-700">Quiz: {score}</span>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {exercises.map((_, idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                idx === currentQuestion
                  ? 'bg-blue-500 scale-125'
                  : answered[idx]
                    ? correct[idx]
                      ? 'bg-green-500'
                      : 'bg-red-400'
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {!quizComplete ? (
          <>
            {/* Question type label */}
            <div className="text-center mb-4">
              <span className="text-lg font-semibold text-gray-600">{getTypeLabel()}</span>
            </div>

            {/* Feedback overlay */}
            {answered[currentQuestion] && (
              <div className={`text-center mb-4 text-2xl font-bold animate-bounce ${
                correct[currentQuestion] ? 'text-green-600' : 'text-red-600'
              }`}>
                {correct[currentQuestion] ? '✅ Riktig!' : `❌ Svaret var ${ex.type === "missingNumber" && ex.missingPosition === 0 ? ex.a : ex.type === "missingNumber" && ex.missingPosition === 1 ? ex.b : ex.answer}`}
              </div>
            )}

            {/* Question content */}
            <form key={quizKey} onSubmit={handleSubmit} className="space-y-6">
              <div className={`p-6 bg-gradient-to-r from-blue-50 to-pink-50 rounded-2xl ${
                answered[currentQuestion]
                  ? correct[currentQuestion]
                    ? 'ring-4 ring-green-400'
                    : 'ring-4 ring-red-400'
                  : ''
              }`}>
                {ex.type === "visual" && renderVisualQuestion()}
                {ex.type === "missingNumber" && renderMissingNumberQuestion()}
                {ex.type === "multipleChoice" && renderMultipleChoiceQuestion()}
                {ex.type === "standard" && renderStandardQuestion()}
                {ex.type === "threeNumbers" && renderThreeNumbersQuestion()}
                {ex.type === "comparison" && renderComparisonQuestion()}
                {ex.type === "money" && renderMoneyQuestion()}
                {ex.type === "makeTarget" && renderMakeTargetQuestion()}
                {ex.type === "balance" && renderBalanceQuestion()}
                {ex.type === "clock" && renderClockQuestion()}
              </div>

              {/* Submit button for types that need it */}
              {!["multipleChoice", "comparison", "makeTarget", "clock"].includes(ex.type) && !answered[currentQuestion] && (
                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={inputs[currentQuestion] === ""}
                    className="bg-gradient-to-r from-blue-500 to-pink-400 text-white px-8 py-3 rounded-2xl text-lg font-bold shadow-md hover:from-pink-400 hover:to-blue-500 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Svar
                  </button>
                </div>
              )}
            </form>
          </>
        ) : (
          /* Quiz complete screen */
          <div className="text-center space-y-6">
            {allCorrect && (
              <div className="text-3xl font-extrabold text-pink-600 animate-bounce">
                🎉 Alle riktig! 🎉
              </div>
            )}

            <div className="text-2xl font-bold text-gray-700">
              Quiz ferdig!
            </div>

            <div className="text-4xl font-extrabold text-green-600">
              {correct.filter(c => c).length} / {EXERCISE_COUNT}
            </div>

            <div className="text-lg text-gray-600">
              Poeng denne runden: <span className="font-bold text-blue-600">{score}</span>
            </div>

            {/* Summary of answers */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {exercises.map((exercise, idx) => {
                let summaryText = "";
                switch (exercise.type) {
                  case "threeNumbers":
                    summaryText = `${exercise.a} ${exercise.op} ${exercise.b} ${exercise.op2} ${exercise.c} = ${exercise.answer}`;
                    break;
                  case "comparison":
                    const left = exercise.op === "+" ? exercise.a + exercise.b : exercise.a - exercise.b;
                    const right = exercise.op2Compare === "+" ? (exercise.a2 || 0) + (exercise.b2 || 0) : (exercise.a2 || 0) - (exercise.b2 || 0);
                    summaryText = `${exercise.a}${exercise.op}${exercise.b} (${left}) vs ${exercise.a2}${exercise.op2Compare}${exercise.b2} (${right})`;
                    break;
                  case "money":
                    summaryText = `Penger: ${exercise.answer} kr`;
                    break;
                  case "makeTarget":
                    summaryText = `Lag ${exercise.targetNumber}: ${exercise.correctPair?.[0]} + ${exercise.correctPair?.[1]}`;
                    break;
                  case "balance":
                    summaryText = `${exercise.leftA} + ${exercise.answer} = ${exercise.rightA} + ${exercise.rightB}`;
                    break;
                  case "clock":
                    summaryText = `Klokka: ${exercise.clockHour}:${exercise.clockMinutes?.toString().padStart(2, '0')}`;
                    break;
                  default:
                    summaryText = `${exercise.a} ${exercise.op} ${exercise.b} = ${exercise.answer}`;
                }
                return (
                  <div key={exercise.id} className={`flex items-center justify-between p-2 rounded-lg ${
                    correct[idx] ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <span className="text-gray-700 text-sm">{summaryText}</span>
                    <span>{correct[idx] ? '✅' : '❌'}</span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="bg-gradient-to-r from-green-500 to-yellow-400 text-white px-8 py-3 rounded-2xl text-lg font-bold shadow-md hover:from-yellow-400 hover:to-green-500 transition-all duration-150"
            >
              Spill igjen! 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
