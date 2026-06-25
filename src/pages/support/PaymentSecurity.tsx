import Layout from "@/components/layout/Layout";
import { CreditCard, Lock, ReceiptText, ShieldCheck } from "lucide-react";

const PaymentSecurity = () => {
  return (
    <Layout>
      <section className="bg-gradient-hero py-14 sm:py-16 md:py-20">
        <div className="container-wide">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Secure Checkout
            </p>
            <h1 className="text-3xl font-bold text-primary-foreground sm:text-4xl md:text-5xl">
              Payment Security
            </h1>
            <p className="mt-4 text-base leading-7 text-primary-foreground/80 sm:text-lg">
              How payments, invoices, GST, order confirmation, and payment checks are handled for
              technology distribution orders through Internext.
            </p>
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
            {[
              {
                icon: Lock,
                title: "Secure Card Processing",
                body:
                  "Online card payments are processed through Stripe. Internext does not store full card numbers or card security codes on our website.",
              },
              {
                icon: ShieldCheck,
                title: "Encrypted Website Traffic",
                body:
                  "Checkout, account, and contact form traffic is served over HTTPS so information is encrypted between your browser and the website.",
              },
              {
                icon: ReceiptText,
                title: "GST and Order Records",
                body:
                  "Order records show item pricing, GST where applicable, freight, and the total charged. Confirmation emails are sent after payment is completed and may include product, freight, and order reference details.",
              },
              {
                icon: CreditCard,
                title: "Payment Review",
                body:
                  "Orders may be reviewed before dispatch for stock confirmation, address accuracy, payment verification, fraud-prevention checks, high-value technology goods, licence eligibility, or unusual delivery instructions.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border/50 bg-card p-5 shadow-card sm:p-7">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10">
                  <item.icon className="h-5 w-5 text-accent" />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-foreground">{item.title}</h2>
                <p className="mt-3 leading-7 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-8 max-w-5xl rounded-2xl border border-border/50 bg-secondary p-5 sm:p-7">
            <h2 className="text-xl font-semibold text-foreground">Accepted Payment Flow</h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Customers can add products to cart and continue to checkout as a guest or signed-in user.
              When payment is completed, Internext records the order, sends internal order notification,
              and sends the customer a confirmation email using the email entered at checkout. Dispatch may
              still be subject to stock allocation, supplier confirmation, fraud checks, licence requirements,
              and delivery validation.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default PaymentSecurity;
