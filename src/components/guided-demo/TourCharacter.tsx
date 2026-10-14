/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

/** Pip, the little report-building companion. Guidance is provided in text. */
export const TourCharacter: React.FC<{ celebrating?: boolean }> = ({ celebrating = false }) => (
  <svg viewBox="0 0 120 128" className="tour-character w-24 h-28 shrink-0" aria-hidden="true">
    <ellipse cx="60" cy="119" rx="30" ry="5" fill="#0071E3" opacity=".1" />
    <g className="tour-character-body">
      <path d="M40 102v10c0 5-13 5-13 0v-6m46-4v10c0 5 13 5 13 0v-6" fill="#0063C7" />
      <path d="M31 66C15 63 13 76 22 84" fill="none" stroke="#0071E3" strokeWidth="11" strokeLinecap="round" />
      <g className="tour-character-wave">
        <path d="M90 69c16-1 18-15 13-24" fill="none" stroke="#0071E3" strokeWidth="11" strokeLinecap="round" />
        <circle cx="102" cy="42" r="8" fill="#59ACFF" />
      </g>
      <rect x="27" y="31" width="66" height="78" rx="26" fill="#0071E3" />
      <path d="M37 44c6-9 15-10 23-10" fill="none" stroke="#59ACFF" strokeWidth="4" strokeLinecap="round" />
      <rect x="35" y="48" width="50" height="37" rx="17" fill="#EDF7FF" />
      <g className="tour-character-eyes" fill="#1D1D1F">
        <ellipse cx="49" cy="62" rx="3" ry="4" />
        <ellipse cx="71" cy="62" rx="3" ry="4" />
      </g>
      <ellipse cx="43" cy="71" rx="5" ry="3" fill="#FFB7C6" />
      <ellipse cx="77" cy="71" rx="5" ry="3" fill="#FFB7C6" />
      <path d={celebrating ? 'M54 71q6 13 12 0Z' : 'M55 72q5 5 10 0'} fill={celebrating ? '#1D1D1F' : 'none'} stroke="#1D1D1F" strokeWidth="2" strokeLinecap="round" />
      <path d="M60 31v-9" stroke="#0071E3" strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="18" r="6" fill="#FFC85C" />
      <rect x="48" y="91" width="24" height="8" rx="4" fill="#59ACFF" />
      <circle cx="55" cy="95" r="2" fill="white" />
      <path d="M12 29l2-6 2 6 6 2-6 2-2 6-2-6-6-2Z" fill="#FFC85C" />
      {celebrating && <path d="M99 16l2-6 2 6 6 2-6 2-2 6-2-6-6-2Z" fill="#FFC85C" />}
    </g>
  </svg>
);
