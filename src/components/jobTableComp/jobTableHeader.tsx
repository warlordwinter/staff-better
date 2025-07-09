import React, { useRef } from 'react';

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
        className="px-3 py-2 bg-blue-600 rounded-xl inline-flex justify-center items-center gap-1 text-white"
      >
        <span className="text-sm font-normal font-['Inter']">Add</span>
        <div className="w-4 h-4 relative">
          <div className="w-1.5 h-1.5 absolute left-[4.67px] top-[4.67px] outline outline-[1.25px] outline-offset-[-0.62px] outline-white" />
          <div className="w-1.5 h-1.5 absolute left-[4.67px] top-[4.67px] outline outline-[1.25px] outline-offset-[-0.62px] outline-white" />
        </div>
      </button>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept= ".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
      />
    </div>
  );
};

export default JobTableHeader;
