import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function FeatureSteps({
    features,
    className = '',
    title = 'How to get Started',
    autoPlayInterval = 3000,
}) {
    const [currentFeature, setCurrentFeature] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            if (progress < 100) {
                setProgress((prev) => prev + 100 / (autoPlayInterval / 100));
            } else {
                setCurrentFeature((prev) => (prev + 1) % features.length);
                setProgress(0);
            }
        }, 100);

        return () => clearInterval(timer);
    }, [progress, features.length, autoPlayInterval]);

    return (
        <div className={`p-8 md:p-12 ${className}`}>
            <div className="max-w-7xl mx-auto w-full">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-10 text-center text-slate-900">
                    {title}
                </h2>
                <div className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-10">
                    <div className="order-2 md:order-1 space-y-8">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                className="flex items-center gap-6 md:gap-8"
                                initial={{ opacity: 0.3 }}
                                animate={{ opacity: index === currentFeature ? 1 : 0.3 }}
                                transition={{ duration: 0.5 }}
                            >
                                <motion.div
                                    className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${index === currentFeature
                                            ? 'bg-gradient-to-br from-blue-600 to-violet-600 border-blue-600 text-white scale-110'
                                            : 'bg-slate-100 border-slate-300 text-slate-600'
                                        }`}
                                >
                                    {index <= currentFeature ? (
                                        <span className="text-lg font-bold">✓</span>
                                    ) : (
                                        <span className="text-lg font-semibold">{index + 1}</span>
                                    )}
                                </motion.div>
                                <div className="flex-1">
                                    <h3 className="text-xl md:text-2xl font-semibold text-slate-900 mb-1">
                                        {feature.title || feature.step}
                                    </h3>
                                    <p className="text-sm md:text-base text-slate-600 leading-relaxed">
                                        {feature.content}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    <div className="order-1 md:order-2 relative h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden rounded-2xl shadow-2xl">
                        <AnimatePresence mode="wait">
                            {features.map(
                                (feature, index) =>
                                    index === currentFeature && (
                                        <motion.div
                                            key={index}
                                            className="absolute inset-0 rounded-2xl overflow-hidden"
                                            initial={{ y: 100, opacity: 0, rotateX: -20 }}
                                            animate={{ y: 0, opacity: 1, rotateX: 0 }}
                                            exit={{ y: -100, opacity: 0, rotateX: 20 }}
                                            transition={{ duration: 0.5, ease: 'easeInOut' }}
                                        >
                                            <img
                                                src={feature.image}
                                                alt={feature.step}
                                                className="w-full h-full object-cover transition-transform transform"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
                                            <div className="absolute bottom-6 left-6 right-6">
                                                <div className="text-white">
                                                    <div className="text-sm font-semibold mb-1 opacity-80">
                                                        {feature.icon}
                                                    </div>
                                                    <h4 className="text-2xl font-bold mb-2">{feature.title}</h4>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                            )}
                        </AnimatePresence>

                        {/* Progress indicator */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                            {features.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setCurrentFeature(index);
                                        setProgress(0);
                                    }}
                                    className={`h-1 rounded-full transition-all duration-300 ${index === currentFeature ? 'w-8 bg-white' : 'w-4 bg-white/50'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
