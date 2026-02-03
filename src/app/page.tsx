"use client";
import React, { useState, useEffect } from "react";
import Confetti from "react-confetti";
import useSound from "use-sound";

// Emoji sets for visual counting
const EMOJI_SETS = ["🍎", "🌟", "🎈", "🐱", "🌸", "🍕", "🚀", "🎁", "🐶", "🦋"];

type ExerciseType = "standard" | "missingNumber" | "visual" | "multipleChoice";

interface Exercise {
  id: string;
  type: ExerciseType;
  a: number;
  b: number;
  op: string;
  answer: number;
  // For missing number: which position is missing (0=first, 1=second, 2=result)
  missingPosition?: number;
  // For visual counting
  emoji?: string;
  // For multiple choice
  choices?: number[];
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

  if (typeRand < 0.25) {
    type = "standard";
  } else if (typeRand < 0.5) {
    type = "missingNumber";
  } else if (typeRand < 0.75) {
    type = "visual";
  } else {
    type = "multipleChoice";
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
      <span className="font-bold text-orange-600">{streak} streak!</span>
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

  // Get question type label
  const getTypeLabel = () => {
    switch (ex.type) {
      case "visual": return "🎨 Count the objects!";
      case "missingNumber": return "🧩 Find the missing number!";
      case "multipleChoice": return "🎯 Pick the right answer!";
      default: return "📝 Solve the problem!";
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-200 via-pink-100 to-yellow-100 p-2 sm:p-4">
      {allCorrect && (
        <Confetti width={width} height={height} numberOfPieces={350} recycle={false} />
      )}

      <div className="bg-white rounded-3xl shadow-2xl p-4 sm:p-8 w-full max-w-lg sm:max-w-2xl border-4 border-blue-100 mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-4 text-center text-blue-700 flex items-center justify-center gap-2">
          <span>⭐️</span> Math Quiz <span>⭐️</span>
        </h1>

        {/* Score bar */}
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="bg-yellow-100 rounded-xl px-4 py-2 shadow">
            <span className="font-semibold text-yellow-700">Total: {totalScore}</span>
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
                {correct[currentQuestion] ? '✅ Correct!' : `❌ It was ${ex.type === "missingNumber" && ex.missingPosition === 0 ? ex.a : ex.type === "missingNumber" && ex.missingPosition === 1 ? ex.b : ex.answer}`}
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
              </div>

              {/* Submit button for non-multiple-choice */}
              {ex.type !== "multipleChoice" && !answered[currentQuestion] && (
                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={inputs[currentQuestion] === ""}
                    className="bg-gradient-to-r from-blue-500 to-pink-400 text-white px-8 py-3 rounded-2xl text-lg font-bold shadow-md hover:from-pink-400 hover:to-blue-500 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Answer
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
                🎉 Perfect Score! 🎉
              </div>
            )}

            <div className="text-2xl font-bold text-gray-700">
              Quiz Complete!
            </div>

            <div className="text-4xl font-extrabold text-green-600">
              {correct.filter(c => c).length} / {EXERCISE_COUNT}
            </div>

            <div className="text-lg text-gray-600">
              Points earned this quiz: <span className="font-bold text-blue-600">{score}</span>
            </div>

            {/* Summary of answers */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {exercises.map((exercise, idx) => (
                <div key={exercise.id} className={`flex items-center justify-between p-2 rounded-lg ${
                  correct[idx] ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <span className="text-gray-700">
                    {exercise.a} {exercise.op} {exercise.b} = {exercise.answer}
                  </span>
                  <span>{correct[idx] ? '✅' : '❌'}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="bg-gradient-to-r from-green-500 to-yellow-400 text-white px-8 py-3 rounded-2xl text-lg font-bold shadow-md hover:from-yellow-400 hover:to-green-500 transition-all duration-150"
            >
              Play Again! 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
