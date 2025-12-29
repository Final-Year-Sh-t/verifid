import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Shield, 
  Search, 
  Users, 
  Key, 
  Lock, 
  FileText, 
  HelpCircle,
  Zap,
  CheckCircle2
} from 'lucide-react';

const sections = [
  {
    id: 'getting-started',
    icon: Zap,
    title: 'Getting Started',
    description: 'Learn how to start using VerifyID',
    content: [
      {
        title: 'Creating an Account',
        content: `To get started with VerifyID, you need to create an account:

1. Click the "Get Started" button on the homepage
2. Fill in your full name, email address, and create a password
3. Click "Create Account" to complete registration
4. You'll be automatically logged in and redirected to the verification portal

Your account gives you access to the verification system where you can look up index numbers.`
      },
      {
        title: 'Signing In',
        content: `If you already have an account:

1. Click "Sign In" in the navigation bar
2. Enter your email and password
3. Click "Sign In" to access your account

If you've forgotten your password, contact your system administrator.`
      },
    ]
  },
  {
    id: 'verification',
    icon: Search,
    title: 'Verification Process',
    description: 'How to verify identities',
    content: [
      {
        title: 'Performing a Verification',
        content: `To verify someone's identity:

1. Navigate to the "Verify" page after signing in
2. Enter the identification number in the search field (e.g., ID-2024-001)
3. Click "Verify" to search

The system will display the verification result:
- **Found**: The identity is verified with full details including name, photo, organization, and validity dates
- **Not Found**: No record matches the identification number

All verification attempts are logged for audit purposes.`
      },
      {
        title: 'Understanding Results',
        content: `When a verification is successful, you'll see:

- **Photo**: The person's ID photo (if available)
- **Full Name**: The verified name
- **Organization**: The associated organization
- **Valid Period**: Issue and expiry dates
- **Status**: Active or Expired

If the ID has expired, a warning will be displayed. Expired IDs should be renewed before they can be considered valid.`
      },
    ]
  },
  {
    id: 'admin',
    icon: Users,
    title: 'Admin Guide',
    description: 'For system administrators',
    content: [
      {
        title: 'Accessing Admin Dashboard',
        content: `The admin dashboard is only accessible to users with admin privileges.

Admin features include:
- View all identity records
- Add new records
- Edit existing records
- Delete records
- View verification logs
- Monitor system statistics

Contact your system administrator if you need admin access.`
      },
      {
        title: 'Managing Records',
        content: `To add a new identity record:

1. Click "Add Record" in the admin dashboard
2. Fill in the required fields:
   - Identification Number (unique identifier)
   - Full Name
   - Organization
   - Issue Date
   - Expiry Date
   - Status (Pending, Verified, Rejected, Expired)
3. Optionally add a photo URL
4. Click "Create" to save

Records must be set to "Verified" status to appear in search results.`
      },
      {
        title: 'Verification Logs',
        content: `The verification logs tab shows all verification attempts:

- Identification number searched
- Who performed the verification
- Whether a record was found
- Date and time

Logs are kept for audit and compliance purposes. The last 50 verifications are displayed.`
      },
    ]
  },
  {
    id: 'security',
    icon: Lock,
    title: 'Security',
    description: 'How we protect your data',
    content: [
      {
        title: 'Data Protection',
        content: `VerifyID implements multiple security measures:

- **Encryption**: All data is encrypted in transit and at rest using industry-standard 256-bit encryption
- **Authentication**: Secure password-based authentication with session management
- **Authorization**: Role-based access control ensures users only access permitted features
- **Audit Logging**: All verification attempts are logged for compliance

Your data is stored securely and never shared with third parties.`
      },
      {
        title: 'Best Practices',
        content: `To maintain security:

1. Use a strong, unique password
2. Don't share your login credentials
3. Log out when using shared computers
4. Report any suspicious activity to your administrator
5. Keep your email address up to date

If you suspect unauthorized access to your account, contact support immediately.`
      },
    ]
  },
];

const faqs = [
  {
    question: 'What is an identification number?',
    answer: 'An identification number is a unique identifier assigned to each person in the verification system. It typically follows a format like ID-YYYY-NNN where YYYY is the year and NNN is a sequential number.',
  },
  {
    question: 'What if I can\'t find a record?',
    answer: 'If a record isn\'t found, it could mean: the identification number is incorrect, the record doesn\'t exist in the system, or the record status is not "verified". Double-check the identification number and try again.',
  },
  {
    question: 'How long are records valid?',
    answer: 'Each record has an issue date and expiry date. The validity period depends on the organization\'s policies. Expired records are marked but still searchable for historical reference.',
  },
  {
    question: 'Can I export verification data?',
    answer: 'Currently, data export is only available to administrators. Contact your admin if you need a report of verification activities.',
  },
  {
    question: 'How do I become an admin?',
    answer: 'Admin privileges are assigned by existing administrators. Contact your organization\'s system administrator if you need elevated access.',
  },
];

export default function Docs() {
  return (
    <Layout>
      {/* Hero */}
      <section className="border-b border-border bg-secondary/30 py-16">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-sm mb-6">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>Documentation</span>
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight mb-4">
              VerifyID Documentation
            </h1>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about using the identity verification system.
            </p>
          </div>
        </div>
      </section>

      <div className="container py-12">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Sidebar */}
          <nav className="lg:col-span-1">
            <div className="sticky top-24 space-y-2">
              <h3 className="font-display font-semibold mb-4">On this page</h3>
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    {section.title}
                  </a>
                );
              })}
              <a
                href="#faq"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <HelpCircle className="h-4 w-4" />
                FAQ
              </a>
            </div>
          </nav>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-12">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <section key={section.id} id={section.id}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
                      <Icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="font-display text-2xl font-bold">{section.title}</h2>
                      <p className="text-muted-foreground text-sm">{section.description}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {section.content.map((item, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm max-w-none text-muted-foreground">
                            {item.content.split('\n\n').map((paragraph, pIndex) => (
                              <p key={pIndex} className="mb-4 last:mb-0 whitespace-pre-line">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}

            {/* FAQ */}
            <section id="faq">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
                  <HelpCircle className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold">Frequently Asked Questions</h2>
                  <p className="text-muted-foreground text-sm">Common questions and answers</p>
                </div>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                      <AccordionItem key={index} value={`faq-${index}`}>
                        <AccordionTrigger className="text-left">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </section>

            {/* API Reference Placeholder */}
            <section id="api">
              <Card className="border-dashed">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" />
                    <CardTitle>API Reference</CardTitle>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                  <CardDescription>
                    External API integration documentation will be available here once the external verification API is configured.
                  </CardDescription>
                </CardHeader>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}