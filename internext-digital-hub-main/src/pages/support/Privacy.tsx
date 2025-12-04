import Layout from "@/components/layout/Layout";

const Privacy = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-16 md:py-20">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              Privacy Policy
            </h1>
            <p className="text-xl text-primary-foreground/80">
              How we collect, use, and protect your information.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto prose prose-slate">
            <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50 space-y-8">
              <div>
                <p className="text-sm text-muted-foreground mb-6">
                  Last updated: November 2024
                </p>
                <p className="text-muted-foreground">
                  Internext Pty Ltd ("we", "us", or "our") is committed to protecting your privacy 
                  and handling your personal information in accordance with the Privacy Act 1988 (Cth) 
                  and the Australian Privacy Principles.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">1. Information We Collect</h2>
                <p className="text-muted-foreground mb-3">
                  We may collect the following types of personal information:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Name and contact details (email, phone, address)</li>
                  <li>Business information (company name, ABN, industry)</li>
                  <li>Account credentials and preferences</li>
                  <li>Order history and transaction details</li>
                  <li>Payment information (processed securely by third-party providers)</li>
                  <li>Communications with us (emails, support requests)</li>
                  <li>Website usage data (cookies, analytics)</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">2. How We Use Your Information</h2>
                <p className="text-muted-foreground mb-3">
                  We use your personal information to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Process orders and provide our products and services</li>
                  <li>Manage your reseller account</li>
                  <li>Communicate with you about orders, products, and services</li>
                  <li>Provide customer support and technical assistance</li>
                  <li>Send marketing communications (with your consent)</li>
                  <li>Improve our website and services</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">3. Sharing Your Information</h2>
                <p className="text-muted-foreground mb-3">
                  We may share your information with:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Courier and logistics partners (for delivery purposes)</li>
                  <li>Payment processors (for transaction processing)</li>
                  <li>Vendor partners (for warranty and support services)</li>
                  <li>Professional advisors (legal, accounting)</li>
                  <li>Government authorities (when required by law)</li>
                </ul>
                <p className="text-muted-foreground mt-3">
                  We do not sell your personal information to third parties.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">4. Data Security</h2>
                <p className="text-muted-foreground">
                  We implement appropriate technical and organisational measures to protect your 
                  personal information against unauthorised access, loss, or misuse. This includes 
                  encryption, access controls, and regular security assessments.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">5. Cookies and Analytics</h2>
                <p className="text-muted-foreground">
                  Our website uses cookies and similar technologies to enhance your experience and 
                  collect analytics data. You can manage cookie preferences through your browser settings.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">6. Your Rights</h2>
                <p className="text-muted-foreground mb-3">
                  You have the right to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Access your personal information</li>
                  <li>Request correction of inaccurate information</li>
                  <li>Request deletion of your information (where applicable)</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Lodge a complaint with the Office of the Australian Information Commissioner</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">7. Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have questions about this privacy policy or wish to exercise your rights, 
                  please contact our Privacy Officer:
                </p>
                <div className="mt-3 text-muted-foreground">
                  <p>Email: privacy@internext.com.au</p>
                  <p>Phone: 1300 123 456</p>
                  <p>Address: Level 10, 123 Business Street, Sydney NSW 2000</p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">8. Changes to This Policy</h2>
                <p className="text-muted-foreground">
                  We may update this privacy policy from time to time. We will notify you of any 
                  significant changes by posting the new policy on our website and updating the 
                  "Last updated" date.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Privacy;
