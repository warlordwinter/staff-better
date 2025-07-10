import React from "react";
import Image from "next/image";

export function AssociateTableTitle() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-8 h-8 relative flex items-center justify-center">
        <Image
          src="/icons/backArrow.svg"
          alt="Back"
          width={24}
          height={24}
          className="object-contain"
        />
      </div>
      <h1 className="text-lg sm:text-2xl md:text-3xl font-semibold text-black">
        Construction Airport Job
      </h1>
    </div>
  );
}
