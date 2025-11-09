'use client';

import Image from 'next/image';
import React from 'react';

type ImportOptionsProps = {
  onUploadCSV: () => void;
  onAddManually: () => void;
};

const ImportOptions: React.FC<ImportOptionsProps> = ({ onUploadCSV, onAddManually }) => {
  return (
    <div className="flex flex-col w-32 h-24 bg-white border border-black divide-y divide-black rounded-lg overflow-hidden shadow-lg">
      <button
        onClick={onUploadCSV}
        className="flex-1 flex items-center justify-start px-3 gap-2 hover:bg-gray-100"
      >
        <Image
          src="/icons/file-csv.svg"
          alt="CSV Icon"
          width={16}
          height={16}
        />
        <span className="text-xs text-black font-inter">Upload File</span>
      </button>

      <button
        onClick={onAddManually}
        className="flex-1 flex items-center justify-start px-3 gap-2 hover:bg-gray-100"
      >
        <Image
          src="/icons/list-plus.svg"
          alt="Add Icon"
          width={16}
          height={16}
        />
        <span className="text-xs text-black font-inter">Add Manually</span>
      </button>
    </div>
  );
};

export default ImportOptions;
