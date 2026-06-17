import { clsx, type ClassValue } from 'clsx'  // Importing the clsx function and ClassValue type from the clsx package for conditional class name merging
import { twMerge } from 'tailwind-merge'      // Importing the twMerge function from the tailwind-merge package to merge Tailwind CSS class names while removing duplicates and conflicting classes

/**
 * @brief The cn function is a utility function that combines the functionality of clsx and twMerge to create a single function for merging class names
 * in a React application. It takes any number of class name inputs and returns a single string with all the class names merged, removing duplicates
 * and resolving conflicts according to Tailwind CSS rules.
 * @function cn
 * @param {...ClassValue[]} inputs - The class name inputs to be merged.
 * @returns {string} The merged class names as a single string.
 */
export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}



// clsx is a utility function for constructing className strings conditionally, while twMerge is a utility function for merging Tailwind CSS class names while removing duplicates and resolving conflicts. The cn function combines these two utilities to provide a convenient way to manage class names in a React application, especially when using Tailwind CSS for styling.
// twMerge is particularly useful when you have conditional class names that may result in conflicting Tailwind classes (e.g., 'bg-red-500' and 'bg-blue-500'), as it will intelligently merge them to ensure the correct styles are applied without duplication. The cn function can be used throughout the application to simplify the process of managing class names based on component props and state.
