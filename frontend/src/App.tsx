import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";

function App() {
  const [count, setCount] = useState(0);

  const handleNotify = () => {
    setCount((c) => c + 1);
    toast.success(`Notification triggered! Count is now ${count + 1}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 text-gray-800">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
      >
        <h1 className="text-3xl font-bold mb-6 text-blue-600">ClaimGuard.ai</h1>
        
        <div className="flex justify-center flex-row items-center gap-6 mb-8">
          <motion.img 
            whileHover={{ scale: 1.1, rotate: 360 }}
            transition={{ duration: 0.5 }}
            src={reactLogo} 
            className="w-16 h-16" 
            alt="React logo" 
          />
          <motion.img 
            whileHover={{ scale: 1.1 }}
            src={viteLogo} 
            className="w-16 h-16" 
            alt="Vite logo" 
          />
        </div>

        <p className="mb-6 text-gray-600">
          Click the button below to test animations and notifications!
        </p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center mx-auto py-2 px-6 rounded-full shadow-md transition-colors"
          onClick={handleNotify}
        >
          Click Me ({count})
        </motion.button>
      </motion.div>
    </div>
  );
}

export default App;
