import Layout from "@/components/layout/Layout";

const Terms = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-14 sm:py-16 md:py-20">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="mb-4 text-3xl font-bold text-primary-foreground sm:text-4xl md:text-5xl">
              Terms & Conditions
            </h1>
            <p className="text-base leading-7 text-primary-foreground/80 sm:text-lg">
              Terms governing purchases, accounts, delivery, warranty, and technology distribution services.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8 rounded-2xl border border-border/50 bg-card p-5 shadow-card sm:p-7 md:p-8">
              <div>
                <p className="text-sm text-muted-foreground mb-6">
                  Last updated: June 2026
                </p>
                <p className="text-muted-foreground">
                  These terms and conditions ("Terms") govern your use of Internext Pty Ltd's 
                  ("Internext", "we", "us") services, including our website, checkout, account portals,
                  and supply of IP technology, security, AV, networking, print, software, consumables,
                  accessories, and related distribution products.
                  By accessing our services, you agree to be bound by these Terms.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">1. Account Registration</h2>
                <p className="text-muted-foreground">
                  You may browse products without an account and may complete eligible purchases as a guest. 
                  Registered customer accounts can view order history, while approved reseller accounts can 
                  access reseller pricing and reseller tools. You agree to provide accurate information and keep 
                  your account credentials confidential. You are responsible for all activities under your account.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">2. Ordering and Pricing</h2>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>All prices are in Australian dollars. Customer prices are shown including GST, while approved reseller prices may be shown excluding GST.</li>
                  <li>Prices are subject to change without notice until an order is confirmed.</li>
                  <li>We reserve the right to correct pricing errors and cancel affected orders.</li>
                  <li>Stock availability is subject to supplier data, warehouse confirmation, allocation, and change at time of order.</li>
                  <li>Product images, specifications, dimensions, and compatibility notes are supplied from vendors and distributors and should be checked against the manufacturer's current documentation for critical deployments.</li>
                  <li>Orders are subject to credit approval for account customers.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">3. Payment Terms</h2>
                <p className="text-muted-foreground">
                  Online orders are payable at checkout unless separate credit terms have been approved in writing. 
                  Standard payment terms for approved accounts are 30 days from invoice date unless otherwise agreed. 
                  We reserve the right to modify credit terms at any time. Late payments may incur interest charges 
                  and suspension of account privileges.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">4. Delivery</h2>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Delivery times are estimates only and not guaranteed.</li>
                  <li>Large, fragile, high-value, or multi-carton technology orders may require special freight handling.</li>
                  <li>Risk of loss passes in accordance with applicable law and the selected freight arrangement.</li>
                  <li>You must inspect goods upon receipt and report visible freight damage, shortages, or incorrect items within 48 hours.</li>
                  <li>Delivery addresses must be accessible during business hours.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">5. Returns and Warranty</h2>
                <p className="text-muted-foreground">
                  Returns and warranty claims are subject to our Returns Policy and Australian Consumer Law.
                  Manufacturer and vendor warranties apply to many products and may require serial numbers,
                  proof of purchase, diagnostic steps, photos, logs, or direct vendor assessment. Approved
                  change-of-mind returns are subject to a 15% restocking fee and may be refused for software,
                  licences, subscriptions, opened consumables, custom orders, special orders, activated services,
                  or configured/installed hardware unless faulty or required by law.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">6. Limitation of Liability</h2>
                <p className="text-muted-foreground">
                  To the maximum extent permitted by law, Internext's liability for any claim 
                  related to products or services is limited to the purchase price of the 
                  relevant products. We are not liable for indirect, consequential, or 
                  special damages, including loss of data, downtime, lost profits, failed installation,
                  system incompatibility, or third-party service interruption, except where liability
                  cannot be excluded under law.
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
                  <li>Use products in a way that breaches vendor licence terms, export controls, cyber security laws, surveillance laws, or applicable installation requirements</li>
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
                  <p>Email: orders@internext.com.au</p>
                  <p>Phone: 1300 U R NEXT (1300 876 398)</p>
                  <p>Address: Unit 7, 7B/256 New Line Rd, Dural NSW 2158</p>
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
