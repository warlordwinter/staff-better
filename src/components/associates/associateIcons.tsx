import React from "react";
import Image from "next/image";

export function UserIcon() {
  return (
    <div className="w-4 h-4 relative">
      <div className="w-2.5 h-3 absolute left-[2.67px] top-[2px] outline outline-1 outline-offset-[-0.5px] outline-neutral-700" />
    </div>
  );
}

export function ActionIcons() {
  return (
    <div className="flex items-center gap-2">
      <Image src="/icons/edit.svg" alt="Edit" width={16} height={16} />
      <Image src="/icons/trash.svg" alt="Delete" width={16} height={16} />
      <Image src="/icons/threeDots.svg" alt="Menu" width={16} height={16} />
    </div>
  );
}
