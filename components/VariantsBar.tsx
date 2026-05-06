"use client";
import { useState } from "react";
import { Variants } from "./Variants";
import { Compare } from "./Compare";

export function VariantsBar() {
  const [compareOpen, setCompareOpen] = useState(false);
  return (
    <>
      <Variants onCompare={() => setCompareOpen(true)} />
      <Compare open={compareOpen} onClose={() => setCompareOpen(false)} />
    </>
  );
}
