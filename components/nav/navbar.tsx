import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function Navbar() {
  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-2xl font-bold">
            Funnel Maker
          </Link>
          <div className="hidden md:flex space-x-6">
            <Link href="/#features" className="text-sm hover:text-primary">
              Features
            </Link>
            <Link href="/templates" className="text-sm hover:text-primary">
              Templates
            </Link>
            <Link href="/pricing" className="text-sm hover:text-primary">
              Pricing
            </Link>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/auth/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link href="/auth/register">
            <Button>Start Building Free</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
