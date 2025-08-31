'use client';

import React from 'react';
import { useTheme } from './theme-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Palette, Moon, Sun } from "lucide-react";

const colorThemes = [
  { value: 'default', label: 'Default', preview: 'bg-primary' },
  { value: 'rainbow', label: 'Rainbow', preview: 'bg-gradient-to-r from-pink-500 to-cyan-500' },
  { value: 'ocean', label: 'Ocean', preview: 'bg-gradient-to-r from-blue-600 to-cyan-400' },
  { value: 'sunset', label: 'Sunset', preview: 'bg-gradient-to-r from-orange-500 to-pink-600' },
  { value: 'forest', label: 'Forest', preview: 'bg-gradient-to-r from-green-600 to-lime-500' },
  { value: 'electric', label: 'Electric', preview: 'bg-gradient-to-r from-purple-600 to-cyan-500' },
];

export function ThemeSelector() {
  const { theme, colorTheme, setTheme, setColorTheme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      {/* Light/Dark Theme Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className="h-9 w-9 p-0"
      >
        {theme === 'dark' ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>

      {/* Color Theme Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Palette className="h-4 w-4" />
            <span className="sr-only">Select color theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Color Theme</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {colorThemes.map((colorOption) => (
            <DropdownMenuItem
              key={colorOption.value}
              onClick={() => setColorTheme(colorOption.value as any)}
              className="flex items-center justify-between"
            >
              <span>{colorOption.label}</span>
              <div className={`w-4 h-4 rounded-full ${colorOption.preview} ${
                colorTheme === colorOption.value ? 'ring-2 ring-foreground' : ''
              }`} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}