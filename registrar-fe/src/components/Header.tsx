import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, ShieldCheck } from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'

const API_DOCS_URL = 'https://dev.api.hopae.com/registrar/api'

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <ShieldCheck className="size-5" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold tracking-tight sm:text-base">Wallet RP Registrar</span>
        <span className="text-[11px] text-muted-foreground">EU Digital Identity Wallet</span>
      </span>
    </Link>
  )
}

export default function Header() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleSignOut = () => {
    logout()
    setOpen(false)
    navigate('/')
  }

  const navLinks = (
    <>
      <a
        href={API_DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        API Docs
      </a>
      <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground">
        Registry
      </Link>
      {token && (
        <Link
          to="/dashboard"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Dashboard
        </Link>
      )}
    </>
  )

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="h-1 w-full bg-primary" />
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">{navLinks}</nav>

        <div className="hidden items-center gap-2 md:flex">
          {token ? (
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/sign-in">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/sign-up">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4 text-sm font-medium">
              <SheetClose asChild>
                <a
                  href={API_DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md px-2 py-2 hover:bg-accent"
                >
                  API Docs
                </a>
              </SheetClose>
              <SheetClose asChild>
                <Link to="/" className="rounded-md px-2 py-2 hover:bg-accent">
                  Registry
                </Link>
              </SheetClose>
              {token && (
                <SheetClose asChild>
                  <Link to="/dashboard" className="rounded-md px-2 py-2 hover:bg-accent">
                    Dashboard
                  </Link>
                </SheetClose>
              )}
            </nav>
            <div className="mt-auto flex flex-col gap-2 p-4">
              {token ? (
                <Button variant="outline" onClick={handleSignOut}>
                  Sign Out
                </Button>
              ) : (
                <>
                  <SheetClose asChild>
                    <Button asChild variant="outline">
                      <Link to="/sign-in">Sign In</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild>
                      <Link to="/sign-up">Sign Up</Link>
                    </Button>
                  </SheetClose>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
