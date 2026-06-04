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
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
