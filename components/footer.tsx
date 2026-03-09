import Link from "next/link";
import { Container } from "@/components/ui/container";

export function Footer() {
  const sections = [
    {
      title: "Marketplace",
      links: [
        { label: "Browse All", href: "/marketplace" },
        { label: "Trainers", href: "/marketplace?category=trainers" },
        { label: "Streetwear", href: "/marketplace?category=streetwear" },
        { label: "Luxury", href: "/marketplace?category=luxury" },
      ],
    },
    {
      title: "Selling",
      links: [
        { label: "Apply to Sell", href: "/apply" },
        { label: "Seller Dashboard", href: "/dashboard" },
        { label: "Authentication", href: "/trust" },
        { label: "Seller Guidelines", href: "/trust" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "Contact", href: "#" },
        { label: "FAQ", href: "#" },
        { label: "Shipping", href: "#" },
        { label: "Returns", href: "#" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Terms of Service", href: "#" },
        { label: "Privacy Policy", href: "#" },
        { label: "Cookie Policy", href: "#" },
      ],
    },
  ];

  return (
    <footer className="premium-card border-t-0 mt-32 diagonal-lines">
      <Container size="wide" className="py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider-luxury">
                <span className="text-gradient-gold">{section.title}</span>
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-white/70 hover:text-gold text-sm transition-all duration-300 hover:translate-x-1 inline-block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gold/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 luxury-border rounded-full flex items-center justify-center gold-glow">
                <span className="text-gold font-black text-xl">FR</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gradient-luxury font-black text-2xl tracking-tighter leading-none">FLIPREPUBLIC</span>
                <span className="text-gold/60 text-[9px] uppercase tracking-widest font-semibold">Est. 2024</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/50 text-xs font-light uppercase tracking-wider">
                © {new Date().getFullYear()} FlipRepublic
              </p>
              <p className="text-gold/40 text-[10px] uppercase tracking-widest font-semibold mt-1">
                Private Market • Elite Resale
              </p>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
