import React from "react";
import Image from "next/image";

export function AddButton() {
  return (
    <button className="px-3 py-2 bg-blue-600 rounded-xl inline-flex justify-end items-center gap-1 text-white text-sm leading-tight hover:bg-blue-700 transition">
      Add Associate
      <Image src="/icons/plus-w.svg" alt="Add" width={16} height={16} />
    </button>
  );
}
