"use client";

import { createContext, useContext } from "react";

// Who is logged in and what their plan allows, seeded by the (app) layout.
export type AccountInfo = {
  email: string | null;
  plus: boolean;
  freePropertyLimit: number;
};

const AccountContext = createContext<AccountInfo>({ email: null, plus: false, freePropertyLimit: 1 });

export function AccountProvider({ value, children }: { value: AccountInfo; children: React.ReactNode }) {
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export const useAccount = () => useContext(AccountContext);
