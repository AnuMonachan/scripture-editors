import { Usj } from "@biblionexus-foundation/scripture-utilities";
import { useEffect, useState } from "react";
import usjData from "../data/3jn.usj.json";

export const useUsfm2Usj = () => {
  const [usj, setUsj] = useState<Usj>();

  useEffect(() => {
    setUsj(usjData as Usj);
  }, []);

  return { usj };
};
