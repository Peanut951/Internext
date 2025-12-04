import Layout from "@/components/layout/Layout";

const Terms = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-16 md:py-20">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              Terms & Conditions
            </h1>
            <p className="text-xl text-primary-foreground/80">
              Terms governing your use of Internext services.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50 space-y-8">
              <div>
                <p className="text-sm text-muted-foreground mb-6">
                  Last updated: November 2024
                </p>
                <p className="text-muted-foreground">
                  These terms and conditions ("Terms") govern your use of Internext Pty Ltd's 
                  ("Internext", "we", "us") services, including our website and reseller portal. 
                  By accessing our services, you agree to be bound by these Terms.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">1. Account Registration</h2>
                <p className="text-muted-foreground">
                  To access reseller pricing and place orders, you must register for an account. 
                  You agree to provide accurate information during registration and keep your 
                  account credentials confidential. You are responsible for all activities under 
                  your account.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">2. Ordering and Pricing</h2>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>All prices are in Australian dollars and exclude GST unless stated otherwise.</li>
                  <li>Prices are subject to change without notice until an order is confirmed.</li>
                  <li>We reserve the right to correct pricing errors and cancel affected orders.</li>
                  <li>Stock availability is subject to change and confirmation at time of order.</li>
                  <li>Orders are subject to credit approval for account customers.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">3. Payment Terms</h2>
                <p className="text-muted-foreground">
                  Standard payment terms are 30 days from invoice date for approved accounts. 
                  We reserve the right to modify credit terms at any time. Late payments may 
                  incur interest charges and suspension of account privileges.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">4. Delivery</h2>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Delivery times are estimates only and not guaranteed.</li>
                  <li>Risk of loss passes to you upon delivery to the carrier.</li>
                  <li>You must inspect goods upon receipt and report damage within 48 hours.</li>
                  <li>Delivery addresses must be accessible during business hours.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">5. Returns and Warranty</h2>
                <p className="text-muted-foreground">
                  Returns and warranty claims are subject to our Returns Policy. Manufacturer 
                  warranties apply to all products. See our Warranty & Returns page for full details.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">6. Limitation of Liability</h2>
                <p className="text-muted-foreground">
                  To the maximum extent permitted by law, Internext's liability for any claim 
                  related to products or services is limited to the purchase price of the 
                  relevant products. We are not liable for indirect, consequential, or 
                  special damages.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">7. Intellectual Property</h2>
                <p className="text-muted-foreground">
                  All content on our website, including logos, images, and text, is owned by 
                  Internext or our licensors. You may not use, reproduce, or distribute our 
                  content without written permission.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">8. Acceptable Use</h2>
                <p className="text-muted-foreground mb-3">
                  You agree not to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Use our services for unlawful purposes</li>
                  <li>Attempt to gain unauthorised access to our systems</li>
                  <li>Interfere with the operation of our website</li>
                  <li>Resell products outside of Australia without permission</li>
                  <li>Share account credentials or pricing information</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">9. Termination</h2>
                <p className="text-muted-foreground">
                  We may suspend or terminate your account at any time for breach of these Terms 
                  or for any other reason at our discretion. Upon termination, outstanding 
                  invoices become immediately due.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">10. Governing Law</h2>
                <p className="text-muted-foreground">
                  These Terms are governed by the laws of New South Wales, Australia. You agree 
                  to submit to the exclusive jurisdiction of the courts of New South Wales.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">11. Changes to Terms</h2>
                <p className="text-muted-foreground">
                  We may update these Terms from time to time. Continued use of our services 
                  after changes constitutes acceptance of the updated Terms.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">12. Contact</h2>
                <p className="text-muted-foreground">
                  For questions about these Terms, please contact us:
                </p>
                <div className="mt-3 text-muted-foreground">
                  <p>Email: legal@internext.com.au</p>
                  <p>Phone: 1300 123 456</p>
                  <p>Address: Level 10, 123 Business Street, Sydney NSW 2000</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Terms;
