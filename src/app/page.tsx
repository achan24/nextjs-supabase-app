import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 text-center md:py-24">
        <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 md:text-6xl">
          Your Personal Guardian Angel
        </h1>
        <p className="mb-8 text-xl text-gray-600 md:text-2xl">
          Organize your life, track your progress, and achieve your goals with AI-powered assistance.
        </p>
        <div className="space-x-4">
          <a
            href="/login"
            className="rounded-full bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors"
          >
            Get Started - It's Free
          </a>
          <a
            href="/login"
            className="rounded-full bg-gray-100 px-8 py-3 text-lg font-semibold text-gray-900 shadow-lg hover:bg-gray-200 transition-colors"
          >
            Sign In
          </a>
        </div>
      </section>

      {/* App Cards Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 md:text-4xl">
            Everything You Need to Succeed
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Task Manager Card */}
            <Link href="/dashboard/tasks" className="block">
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow h-full">
                <h3 className="text-xl font-semibold mb-2">Task Manager</h3>
                <p className="text-gray-600 mb-4">
                  Create, organize, and track your tasks with priority levels and due dates.
                </p>
                <div className="text-blue-600 font-medium">Go to Task Manager →</div>
              </div>
            </Link>

            {/* AI Assistant Card */}
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow h-full">
              <h3 className="text-xl font-semibold mb-2">AI Assistant</h3>
              <p className="text-gray-600 mb-4">
                Get personalized suggestions and help managing your tasks and time.
              </p>
              <div className="text-blue-600 font-medium">Coming Soon →</div>
            </div>

            {/* Process Flow Card */}
            <Link href="/dashboard/process-flow" className="block">
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow h-full">
                <h3 className="text-xl font-semibold mb-2">Process Flow</h3>
                <p className="text-gray-600 mb-4">
                  Visualize and track your learning progress, practice sessions, and skill development through interactive process flows.
                </p>
                <div className="text-blue-600 font-medium">Go to Process Flow →</div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 md:text-4xl">
            Powerful Features
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 text-2xl">✨</div>
              <h3 className="mb-2 text-xl font-semibold">Simple & Intuitive</h3>
              <p className="text-gray-600">
                Clean interface that lets you focus on what matters most.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 text-2xl">🔄</div>
              <h3 className="mb-2 text-xl font-semibold">Sync Everywhere</h3>
              <p className="text-gray-600">
                Access your data from any device, always in sync.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 text-2xl">🔒</div>
              <h3 className="mb-2 text-xl font-semibold">Secure & Private</h3>
              <p className="text-gray-600">
                Your data is encrypted and only accessible by you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-50 py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">
            Ready to Get Started?
          </h2>
          <p className="mb-8 text-xl text-gray-600">
            Join thousands of users who have already improved their productivity.
          </p>
          <a
            href="/login"
            className="inline-block rounded-full bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors"
          >
            Start Now - It's Free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8">
        <div className="container mx-auto px-6 text-center text-gray-600">
          <p>© 2024 Guardian Angel. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
} 