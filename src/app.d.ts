declare global {
  namespace App {
    interface Locals {
      user: { email: string } | null
    }
  }
}

export {}
