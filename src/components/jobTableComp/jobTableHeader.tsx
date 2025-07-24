import React, { useRef } from 'react';
import Image from 'next/image';

interface Props {
  onFileSelect?: (file: File) => void;
}

const JobTableHeader: React.FC<Props> = ({ onFileSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
  };

  return (
    <div className="flex justify-between items-center">
      <h1 className="text-black text-5xl font-semibold font-['Inter']">Jobs</h1>

      <button
        onClick={handleClick}
        className="px-3 py-2 bg-blue-600 rounded-xl inline-flex justify-center items-center gap-1 text-white cursor-pointer"
      >
        <span className="text-sm font-normal font-['Inter']">Add</span>
        <div className="w-4 h-4 relative">
          <Image
            src="/icons/plus-w.svg"
            alt="Upload"
            width={16}
            height={16}
            className="object-contain"
          />
        </div>
      </button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
      />
    </div>
  );
};

export default JobTableHeader;
