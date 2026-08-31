import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { signToken } from "../../../../lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = body?.email?.trim();
    const password = body?.password;

    if (!email || !password) {
      return NextResponse.json(
        {
          error: "Email and password are required",
        },
        {
          status: 400,
        }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "Invalid email or password",
        },
        {
          status: 401,
        }
      );
    }

    // Check whether account is active
    if (!user.isActive) {
      return NextResponse.json(
        {
          error: "Your account is inactive",
        },
        {
          status: 403,
        }
      );
    }

    // Compare password with hashed password
    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return NextResponse.json(
        {
          error: "Invalid email or password",
        },
        {
          status: 401,
        }
      );
    }

    // Generate JWT token
    const token = await signToken({
      id: user.id,
      role: user.role as "ADMIN" | "FACULTY" | "STUDENT",
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 1 day
    });

    // Successful login
    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Login API Error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}