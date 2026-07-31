/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** True when the request carries a validated Sanity preview cookie. */
    preview: boolean
  }
}
