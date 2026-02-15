"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase";

export interface SignupInput {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  address?: string;
}

export interface AuthResult {
  success: boolean;
  message?: string;
}

export async function signUpWithProfile(input: SignupInput): Promise<AuthResult> {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        phone: input.phone,
      },
    },
  });

  if (error) {
    return { success: false, message: error.message };
  }

  const userId = data.user?.id;
  if (!userId) {
    return { success: false, message: "Signup failed. No user returned." };
  }

  return { success: true };
}

export async function logoutUser(): Promise<AuthResult> {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}
