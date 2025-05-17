import React from 'react';

interface CaptionsProps {
  text: string;
}

const Captions: React.FC<CaptionsProps> = ({ text }) => (
  <div className="bg-gray-100 p-4 rounded-lg text-lg text-gray-800 mt-4">
    {text}
  </div>
);

export default Captions; 