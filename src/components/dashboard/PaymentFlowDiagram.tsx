"use client";

import { motion } from "framer-motion";
import { Users, Building2, CreditCard, ArrowRight, Ticket } from "lucide-react";

export function PaymentFlowDiagram() {
  return (
    <div className="py-3">
      {/* Main Flow - Horizontal on desktop, vertical on mobile */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3">
        {/* Customer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-row md:flex-col items-center gap-2 md:gap-1"
        >
          <div className="relative">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
          <div className="text-left md:text-center">
            <h3 className="font-semibold text-gray-900 dark:text-white text-xs md:text-sm">
              Bezoeker
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 hidden md:block">
              Koopt tickets
            </p>
          </div>
        </motion.div>

        {/* Arrow 1 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex items-center md:self-start md:mt-3"
        >
          <motion.div
            animate={{
              x: [0, 5, 0],
              rotate: [0, 0, 0],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="md:rotate-0 rotate-90"
          >
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
          </motion.div>
        </motion.div>

        {/* Mollie */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-row md:flex-col items-center gap-2 md:gap-1"
        >
          <div className="relative">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
          <div className="text-left md:text-center">
            <h3 className="font-semibold text-gray-900 dark:text-white text-xs md:text-sm">
              Mollie
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 hidden md:block">
              Verwerkt betaling
            </p>
          </div>
        </motion.div>

        {/* Arrow 2 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="flex items-center md:self-start md:mt-3"
        >
          <motion.div
            animate={{
              x: [0, 5, 0],
              rotate: [0, 0, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
            className="md:rotate-0 rotate-90"
          >
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
          </motion.div>
        </motion.div>

        {/* Organization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex flex-row md:flex-col items-center gap-2 md:gap-1"
        >
          <div className="relative">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
          <div className="text-left md:text-center">
            <h3 className="font-semibold text-gray-900 dark:text-white text-xs md:text-sm">
              Jouw Organisatie
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 hidden md:block">
              Ontvangt geld
            </p>
          </div>
        </motion.div>
      </div>

      {/* Entro Platform - Central role */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="mt-4 mb-3"
      >
        <div className="relative">
          {/* Connection lines */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300 dark:via-orange-700 to-transparent"></div>

          <div className="flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-orange-50/50 via-orange-50 to-orange-50/50 dark:from-orange-950/20 dark:via-orange-950/40 dark:to-orange-950/20 rounded-xl border border-orange-200 dark:border-orange-900/50">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md flex-shrink-0">
              <Ticket className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="flex-1 text-center">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">
                Entro Platform
              </h3>
              <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                Regelt eventpagina, checkout, tickets en scanning
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom note */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.8 }}
        className="text-center"
      >
        <p className="text-xs text-gray-500 dark:text-gray-500 leading-relaxed italic">
          Betalingen gaan veilig via Mollie — Entro slaat geen bankgegevens op
        </p>
      </motion.div>
    </div>
  );
}
