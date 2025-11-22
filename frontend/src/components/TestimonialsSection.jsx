import { motion } from 'framer-motion';
import { TestimonialsColumn } from './ui/TestimonialsColumn';

const testimonials = [
  {
    text: "I sold my unused Zomato coupons in minutes! Simple and secure platform.",
    image: "https://randomuser.me/api/portraits/women/1.jpg",
    name: "Priya Sharma",
    role: "Freelancer",
  },
  {
    text: "Found exclusive Flipkart coupons for half the price. Love this marketplace!",
    image: "https://randomuser.me/api/portraits/men/2.jpg",
    name: "Rahul Verma",
    role: "Student",
  },
  {
    text: "The support team is exceptional, making coupon trading smooth and hassle-free.",
    image: "https://randomuser.me/api/portraits/women/3.jpg",
    name: "Anita Desai",
    role: "Business Owner",
  },
  {
    text: "This platform's seamless interface made selling my unused coupons incredibly easy.",
    image: "https://randomuser.me/api/portraits/men/4.jpg",
    name: "Vikram Singh",
    role: "Software Engineer",
  },
  {
    text: "Quick transactions and instant updates. Best coupon marketplace I've used!",
    image: "https://randomuser.me/api/portraits/women/5.jpg",
    name: "Meera Patel",
    role: "Marketing Manager",
  },
  {
    text: "The smooth buying process exceeded expectations. Found amazing deals here!",
    image: "https://randomuser.me/api/portraits/women/6.jpg",
    name: "Kavya Reddy",
    role: "Designer",
  },
  {
    text: "User-friendly design and great customer support. Highly recommend CouponXchange!",
    image: "https://randomuser.me/api/portraits/men/7.jpg",
    name: "Arjun Malhotra",
    role: "Entrepreneur",
  },
  {
    text: "They delivered a solution that exceeded expectations. My go-to for coupon trading.",
    image: "https://randomuser.me/api/portraits/women/8.jpg",
    name: "Sana Khan",
    role: "Content Creator",
  },
  {
    text: "Using CouponXchange, I saved hundreds on shopping. Absolutely worth it!",
    image: "https://randomuser.me/api/portraits/men/9.jpg",
    name: "Karan Joshi",
    role: "Photographer",
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

const TestimonialsSection = () => {
  return (
    <section className="bg-white py-16 sm:py-20 lg:py-24 relative">
      <div className="container mx-auto px-4 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-[540px] mx-auto"
        >
          <div className="flex justify-center">
            {/* <div className="border border-slate-200 py-1 px-4 rounded-lg bg-slate-50 text-slate-700 text-sm font-medium"> */}
              {/* Testimonials */}
            {/* </div> */}
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mt-5 text-slate-900 text-center">
            What our users say
          </h2>
          <p className="text-center mt-5 text-slate-600 text-lg">
            See what our customers have to say about us.
          </p>
        </motion.div>

        <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn
            testimonials={secondColumn}
            className="hidden md:block"
            duration={19}
          />
          <TestimonialsColumn
            testimonials={thirdColumn}
            className="hidden lg:block"
            duration={17}
          />
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
