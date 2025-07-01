"use client";
import React, { useState } from "react";
import Confetti from "react-confetti";
import useSound from "use-sound";

// Helper to generate a single exercise
function generateExercise(id: string) {
  const op = Math.random() < 0.5 ? "+" : "-";
  let a = Math.floor(Math.random() * 21);
  let b = Math.floor(Math.random() * 21);
  if (op === "-") {
    if (a < b) [a, b] = [b, a]; // avoid negative results
  }
  return {
    id,
    a,
    b,
    op,
    answer: op === "+" ? a + b : a - b,
  };
}

function generateExercises(n = 5) {
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

export default function MathQuiz() {
  const EXERCISE_COUNT = 5;
  const [quizKey, setQuizKey] = useState(() => `${Date.now()}-${Math.random()}`);
  const [exercises, setExercises] = useState(() => generateExercises(EXERCISE_COUNT));
  const [inputs, setInputs] = useState(Array(EXERCISE_COUNT).fill(""));
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [width, height] = useWindowSize();
  const [playCelebration] = useSound("/celebration.wav", { volume: 0.5 });

  // Play sound when all correct and checked
  React.useEffect(() => {
    if (checked && score !== null && score === exercises.length) {
      playCelebration();
    }
    // Only play when celebration is shown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, score, exercises.length]);

  const handleInput = (idx: number, value: string) => {
    if (/^\d{0,3}$/.test(value)) {
      const newInputs = [...inputs];
      newInputs[idx] = value;
      setInputs(newInputs);
    }
  };

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    setChecked(true);
    const correct = exercises.reduce((acc, ex, idx) => acc + (parseInt(inputs[idx]) === ex.answer ? 1 : 0), 0);
    setScore(correct);
    setTotalScore(prev => prev + correct);
  };

  const handleReset = () => {
    const newKey = `${Date.now()}-${Math.random()}`;
    setQuizKey(newKey);
    const newExercises = generateExercises(EXERCISE_COUNT);
    setExercises(newExercises);
    setInputs(Array(newExercises.length).fill(""));
    setChecked(false);
    setScore(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-200 via-pink-100 to-yellow-100 p-2 sm:p-4">
      {checked && score !== null && score === exercises.length && (
        <Confetti width={width} height={height} numberOfPieces={350} recycle={false} />
      )}
      <div className="bg-white rounded-3xl shadow-2xl p-2 sm:p-6 w-full max-w-lg sm:max-w-2xl md:max-w-3xl border-4 border-blue-100 mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 sm:mb-3 text-center text-blue-700 font-sans flex items-center justify-center gap-2">
          <span role="img" aria-label="star">⭐️</span> Math Quiz for First Graders <span role="img" aria-label="star">⭐️</span>
        </h1>
        <div className="mb-1 text-center text-base sm:text-lg font-semibold text-yellow-700 font-sans">
          <span className="bg-yellow-100 rounded-xl px-2 sm:px-4 py-1 inline-block shadow">Total Score: {totalScore}</span>
        </div>
        {checked && score !== null && score === exercises.length && (
          <div className="mb-2 text-center text-2xl sm:text-3xl font-extrabold text-pink-600 animate-bounce">
            🎉 Congratulations! 🎉<br />
            You got all the answers correct!
          </div>
        )}
        {checked && score !== null && (
          <div className="mb-2 text-center text-lg sm:text-2xl font-bold text-green-700 font-sans">
            Score: {score} / {exercises.length}
          </div>
        )}
        <div className="border-b border-dashed border-blue-200 mb-2"></div>
        <form key={quizKey} onSubmit={handleCheck}>
          <ol className="space-y-3 sm:space-y-6 mb-4 sm:mb-6">
            {exercises.map((ex, idx) => (
              <li key={ex.id} className="flex flex-row items-center gap-0.5 py-1 sm:py-2 justify-center w-full">
                <span className="text-lg sm:text-2xl font-mono text-right text-gray-800 select-none flex-shrink-0">{ex.a}</span>
                <span className="text-lg sm:text-2xl font-mono text-gray-800 select-none flex-shrink-0 mx-0">{ex.op}</span>
                <span className="text-lg sm:text-2xl font-mono text-right text-gray-800 select-none flex-shrink-0">{ex.b}</span>
                <span className="text-lg sm:text-2xl font-mono text-gray-800 select-none flex-shrink-0 mx-0">=</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`border-2 rounded-xl px-2 sm:px-4 py-2 w-14 sm:w-20 text-center text-lg sm:text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-pink-200 bg-white text-gray-900 border-blue-300 transition-all duration-150 shadow-sm hover:border-pink-400 ml-1 ${checked ? (parseInt(inputs[idx]) === ex.answer ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50') : ''}`}
                  value={inputs[idx]}
                  onChange={e => handleInput(idx, e.target.value)}
                  disabled={checked}
                  aria-label={`Answer for ${ex.a} ${ex.op} ${ex.b}`}
                />
                {checked && (
                  <span className={`ml-2 text-xl sm:text-2xl ${parseInt(inputs[idx]) === ex.answer ? 'text-green-600' : 'text-red-600'}`}>{parseInt(inputs[idx]) === ex.answer ? '✔️' : `✖️ (${ex.answer})`}</span>
                )}
              </li>
            ))}
          </ol>
          <div className="flex gap-2 sm:gap-4 justify-center">
            {!checked ? (
              <button type="submit" className="bg-gradient-to-r from-blue-500 to-pink-400 text-white px-4 sm:px-8 py-2 sm:py-3 rounded-2xl text-base sm:text-lg font-bold shadow-md hover:from-pink-400 hover:to-blue-500 transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-blue-200 w-full sm:w-auto">Check Answers</button>
            ) : (
              <button type="button" onClick={handleReset} className="bg-gradient-to-r from-green-500 to-yellow-400 text-white px-4 sm:px-8 py-2 sm:py-3 rounded-2xl text-base sm:text-lg font-bold shadow-md hover:from-yellow-400 hover:to-green-500 transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-green-200 w-full sm:w-auto">Try New Quiz</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
