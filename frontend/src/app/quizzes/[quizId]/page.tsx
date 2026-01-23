import React from 'react';

export default function QuizPage({ params }: { params: { quizId: string } }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <h1 className="text-2xl font-bold mb-4">Quiz {params.quizId}</h1>
            <p>Quiz content coming soon...</p>
        </div>
    );
}
