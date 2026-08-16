"use server";

import { redirect } from "next/navigation";

import type { Role } from "@/domain/auth";
import { roles } from "@/domain/auth";
import {
  clearDevelopmentViewer,
  developmentAuthEnabled,
  setDevelopmentViewer,
} from "@/server/auth/session";

export async function developmentSignIn(formData: FormData) {
  if (!developmentAuthEnabled()) redirect("/sign-in?error=disabled");
  const role = formData.get("role");
  if (!roles.includes(role as Role)) redirect("/sign-in?error=role");
  await setDevelopmentViewer(role as Role);
  redirect(role === "owner" || role === "maintainer" ? "/operations" : "/");
}

export async function signOut() {
  await clearDevelopmentViewer();
  redirect("/");
}
