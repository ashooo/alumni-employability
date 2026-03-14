import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, ShieldCheck, BarChart3, Users, ArrowRight, ChevronDown, Lock, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const navigate = useNavigate();

  const steps = [
    { icon: ShieldCheck, title: 'Activate Account', desc: 'Verify your alumni identity and set up your credentials securely.' },
    { icon: BarChart3, title: 'Complete Survey', desc: 'Answer the tracer survey to help us understand your career journey.' },
    { icon: Users, title: 'Get Insights', desc: 'Receive personalized job recommendations and view employment analytics.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header 
        className="gradient-hero text-primary-foreground relative overflow-hidden"
        style={{backgroundImage: `linear-gradient(rgba(16, 60, 35, 0.85), rgba(10, 45, 25, 0.9)), url('/plp_bg.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed', }}>
        <nav className="container mx-auto px-6 py-4 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20 backdrop-blur-sm">
              <img 
                src="/plp_logo.png" 
                alt="PLP Logo" 
                className="h-12 w-12 object-contain" 
              />
            </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display font-bold text-lg">Alumni Tracer</span>
            <span className="text-[10px] uppercase tracking-widest opacity-70">Pamantasan ng Lungsod ng Pasig</span>
          </div>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate('/login')}>Login</Button>
            <Button className="bg-primary-foreground/10 backdrop-blur border border-primary-foreground/20 hover:bg-primary-foreground/20 text-primary-foreground transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] shadow-[0_0_15px_rgba(255,255,255,0.15)]" onClick={() => navigate('/activate')}>Activate Account</Button>
          </div>
        </nav>

        <div className="container mx-auto px-6 py-24 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary-foreground/10 backdrop-blur text-sm font-medium mb-6 border border-primary-foreground/20">University Alumni Employability System</span>
            <h1 className="text-4xl md:text-6xl font-display font-extrabold leading-tight mb-6">Track, Predict &<br />Empower Alumni Careerr</h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto mb-10">A comprehensive tracer and prediction system that connects alumni outcomes with institutional growth.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary-foreground text-foreground hover:bg-primary-foreground/90 font-semibold text-base px-8 gap-2" onClick={() => navigate('/login')}>Login <ArrowRight className="h-4 w-4" /></Button>
              <Button size="lg" className="bg-primary-foreground text-primary border-2 border-primary-foreground hover:bg-transparent hover:text-primary-foreground font-semibold text-base px-8 backdrop-blur-sm transition-all duration-300" onClick={() => navigate('/activate')}>Activate Account</Button>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.6 }} className="mt-16">
            <ChevronDown className="h-6 w-6 mx-auto animate-bounce text-primary-foreground/40" />
          </motion.div>
        </div>
      </header>

      {/* How it works */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-display font-bold text-center mb-4">How It Works</h2>
          <p className="text-muted-foreground text-center mb-16 max-w-lg mx-auto">Get started in three simple steps</p>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.2 }} className="glass-card p-8 text-center group hover:border-primary/30 transition-colors">
                <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-5 group-hover:bg-primary/20 transition-colors">
                  <s.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-sm font-bold text-primary mb-2">Step {i + 1}</div>
                <h3 className="text-xl font-display font-bold mb-3">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-6">
          <div className="glass-card p-8 md:p-12 flex flex-col md:flex-row items-start gap-6">
            <div className="p-4 rounded-2xl bg-primary/10 shrink-0">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-display font-bold mb-3">Your Data Privacy Matters</h3>
              <p className="text-muted-foreground leading-relaxed">
                All personal data collected through this system is handled in strict compliance with the Data Privacy Act. Your information is used solely for employment tracking and institutional improvement purposes. You have full control over your data and can request modifications or deletion at any time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-2xl font-display font-bold mb-6">Need Help?</h3>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Mail className="h-5 w-5 text-primary" />
              <span>support@university.edu</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Phone className="h-5 w-5 text-primary" />
              <span>(02) 8123-4567</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold text-foreground">Alumni Tracer</span>
          </div>
          <p>© 2026 University Alumni Employability Tracer System • v1.0</p>
        </div>
      </footer>
    </div>
  );
}
