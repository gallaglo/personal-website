import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-gray-200">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <nav className="flex items-center justify-between font-sans">
          <Link href="/" className="text-lg font-semibold hover:text-gray-600">
            Logan Gallagher
          </Link>
          <div className="flex gap-6 text-sm">
            <Link href="/" className="hover:text-gray-600">
              About
            </Link>
            <Link href="/blog" className="hover:text-gray-600">
              Blog
            </Link>
            <Link href="/projects" className="hover:text-gray-600">
              Projects
            </Link>
            <Link href="/contact" className="hover:text-gray-600">
              Contact
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
