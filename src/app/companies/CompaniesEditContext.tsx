"use client";

import React from "react";

export const CompaniesEditContext = React.createContext<
  ((id: number) => void) | undefined
>(undefined);
