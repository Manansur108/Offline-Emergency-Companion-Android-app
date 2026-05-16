import type { EmergencyProtocol, EmergencyType } from '../types/emergency';

export const EMERGENCY_PROTOCOLS: Record<Exclude<EmergencyType, 'unknown'>, EmergencyProtocol> = {
  cardiac_arrest: {
    type: 'cardiac_arrest',
    title: 'CARDIAC ARREST',
    steps: [
      {
        number: 1,
        instruction: 'Check if the person is responsive.',
        detail: 'Tap their shoulders firmly and shout "Are you okay?" Repeat twice.',
        altGuidance: 'If they moan or move slightly, place them in the recovery position on their side and watch closely.',
      },
      {
        number: 2,
        instruction: 'Call 911 immediately.',
        detail: 'Put the call on speaker so your hands stay free. Tell them your location, that the person is unconscious, and whether they are breathing.',
        altGuidance: 'If you cannot call, shout for someone nearby to call 911 while you begin compressions.',
      },
      {
        number: 3,
        instruction: 'Begin chest compressions.',
        detail: 'Place the heel of one hand on the center of the chest. Put the other hand on top. Push hard and fast, 100 to 120 times per minute, at least 2 inches deep. Let the chest rise fully between pushes.',
        altGuidance: 'If your arms tire, ask a bystander to switch with you every 2 minutes. Keep compressions going.',
      },
      {
        number: 4,
        instruction: 'Give 2 rescue breaths if trained and willing.',
        detail: 'After 30 compressions, tilt the head back, lift the chin, pinch the nose, cover the mouth, and blow until the chest rises. Give 2 breaths, then resume compressions.',
        altGuidance: 'If you are not comfortable with rescue breaths, continue hands-only CPR with steady compressions.',
      },
      {
        number: 5,
        instruction: 'Find and use an AED if available.',
        detail: 'Turn the AED on and follow its voice prompts. Continue CPR until the pads are attached and the device tells you what to do.',
        altGuidance: 'If no AED is available, continue CPR cycles until emergency help arrives.',
      },
      {
        number: 6,
        instruction: 'Continue until help arrives.',
        detail: 'Do not stop unless the person starts breathing normally, an AED tells you to pause, or paramedics take over.',
        altGuidance: 'If the person starts breathing normally, place them on their side and watch their breathing closely.',
      },
    ],
  },
  bleeding: {
    type: 'bleeding',
    title: 'SEVERE BLEEDING',
    steps: [
      {
        number: 1,
        instruction: 'Call 911 and protect yourself from blood contact.',
        detail: 'Use gloves if available. If not, use a plastic bag, cloth, or have the injured person press on their own wound.',
        altGuidance: 'If gloves are unavailable, use the thickest available cloth as a barrier and wash your hands afterward.',
      },
      {
        number: 2,
        instruction: 'Apply firm, continuous pressure to the wound.',
        detail: 'Place clean cloth or gauze directly on the wound. Press hard with both hands. Do not lift the cloth. Add more cloth on top if it soaks through.',
        altGuidance: 'If an object is embedded, do not remove it. Press around it, not on it.',
      },
      {
        number: 3,
        instruction: 'Elevate the injured limb if you can do so safely.',
        detail: 'Raise the arm or leg while maintaining pressure. Keep the person still and calm.',
        altGuidance: 'Do not elevate if you suspect a broken bone. Maintain pressure and keep the limb still.',
      },
      {
        number: 4,
        instruction: 'Apply a tourniquet if limb bleeding is uncontrolled.',
        detail: 'Place it 2 to 3 inches above the wound, not on a joint. Tighten until bleeding stops. Note the exact time applied.',
        altGuidance: 'If you must improvise, use a wide strip of cloth and a rigid object to twist it tight. Secure it so it does not unwind.',
      },
      {
        number: 5,
        instruction: 'Keep the person warm and still until help arrives.',
        detail: 'Lay them down, cover them, and watch for pale skin, rapid breathing, confusion, or weakness.',
        altGuidance: 'If shock signs appear, raise their legs about 12 inches unless head, neck, back, hip, or leg injury is suspected.',
      },
    ],
  },
  unsafe_scene: {
    type: 'unsafe_scene',
    title: 'UNSAFE SCENE',
    steps: [
      {
        number: 1,
        instruction: 'Get quiet and move away if you can.',
        detail: 'Do not confront the person. Move toward an exit, locked room, public place, or cover if it is safe.',
        altGuidance: 'If moving would expose you, stay hidden, silence the phone, and keep the line open.',
      },
      {
        number: 2,
        instruction: 'Contact 911 without speaking if needed.',
        detail: 'Use the quiet script: I cannot speak. I need police/EMS. My location is below.',
        altGuidance: 'If text-to-911 is unavailable, call 911 and leave the line open so dispatch can listen.',
      },
      {
        number: 3,
        instruction: 'Report danger facts only when safe.',
        detail: 'Weapon, threat, suspect location, injuries, and your exact location. Keep messages short.',
        altGuidance: 'If typing is unsafe, send only your location and the words cannot speak.',
      },
      {
        number: 4,
        instruction: 'Stay hidden or away until help arrives.',
        detail: 'Keep others back. Do not return for belongings or confront anyone.',
        altGuidance: 'If you must leave, go to the safest lit public place and keep 911 updated.',
      },
    ],
  },
  trauma: {
    type: 'trauma',
    title: 'TRAUMA / RESCUE',
    steps: [
      {
        number: 1,
        instruction: 'Make the scene safe before helping.',
        detail: 'Do not enter traffic, water, fire, machinery, unstable structures, or violence. Call 911 from safety.',
        altGuidance: 'If you cannot reach them safely, stay back and tell 911 exactly where they are.',
      },
      {
        number: 2,
        instruction: 'Do not move the injured person.',
        detail: 'Keep their head, neck, and back still. Move them only if there is immediate danger such as fire or traffic.',
        altGuidance: 'If they must be moved, drag in the direction of the body axis and avoid twisting if possible.',
      },
      {
        number: 3,
        instruction: 'Keep traffic and bystanders away.',
        detail: 'Ask someone to warn traffic from a safe distance. Do not stand in the road or block responders.',
        altGuidance: 'Use lights or hazard flashers from safety. Do not put yourself in the lane of travel.',
      },
      {
        number: 4,
        instruction: 'For water, throw or reach. Do not enter.',
        detail: 'Throw a float, rope, branch, or clothing. Reach from stable ground. Going in can create another victim.',
        altGuidance: 'If they are out of the water and not breathing normally, start the not-breathing guide.',
      },
      {
        number: 5,
        instruction: 'For entrapment, do not pull them free.',
        detail: 'Turn off machinery only if you can do it safely. Wait for rescue tools unless fire or collapse creates immediate danger.',
        altGuidance: 'Control visible bleeding if reachable without moving trapped body parts.',
      },
    ],
  },
  carbon_monoxide: {
    type: 'carbon_monoxide',
    title: 'CARBON MONOXIDE',
    steps: [
      {
        number: 1,
        instruction: 'Leave the building now.',
        detail: 'Get everyone to fresh air. Do not search for the source. Do not re-enter.',
        altGuidance: 'If someone cannot walk, leave if you can and tell 911 their exact location inside.',
      },
      {
        number: 2,
        instruction: 'Call 911 from outside.',
        detail: 'Report CO alarm, symptoms, number of people exposed, pets, and whether anyone is still inside.',
        altGuidance: 'If you cannot speak well, say carbon monoxide, location, people inside, symptoms.',
      },
      {
        number: 3,
        instruction: 'Keep people in fresh air.',
        detail: 'Watch for headache, dizziness, nausea, confusion, chest pain, or fainting.',
        altGuidance: 'If someone becomes unresponsive and is not breathing normally, start the not-breathing guide.',
      },
    ],
  },
  gas_leak: {
    type: 'gas_leak',
    title: 'GAS LEAK',
    steps: [
      {
        number: 1,
        instruction: 'Leave without touching switches.',
        detail: 'Do not turn lights on or off. Do not use flames, appliances, garage doors, or anything that can spark.',
        altGuidance: 'If you are already outside, stay outside and keep others away.',
      },
      {
        number: 2,
        instruction: 'Call 911 from outside.',
        detail: 'Report gas smell, hissing, exact location, people inside, and nearby ignition hazards.',
        altGuidance: 'If calling might create danger, move farther away first.',
      },
      {
        number: 3,
        instruction: 'Do not re-enter.',
        detail: 'Wait for fire department or utility crews. Keep people back from doors, windows, and vents.',
        altGuidance: 'If anyone has symptoms, tell 911 and keep them in fresh air.',
      },
    ],
  },
  powerline: {
    type: 'powerline',
    title: 'POWERLINE HAZARD',
    steps: [
      {
        number: 1,
        instruction: 'Stay far away from the wire.',
        detail: 'Keep at least a bus-length away. The ground can be energized even if the wire is not moving.',
        altGuidance: 'If you are too close, shuffle away with tiny steps keeping feet together.',
      },
      {
        number: 2,
        instruction: 'If a wire is on your vehicle, stay inside.',
        detail: 'Do not touch the ground and vehicle at the same time. Call 911 and wait unless there is fire.',
        altGuidance: 'If fire forces exit, jump clear with both feet together, then shuffle away.',
      },
      {
        number: 3,
        instruction: 'Keep others back and call 911.',
        detail: 'Report downed wire, arcing, vehicle contact, injuries, and exact location.',
        altGuidance: 'Do not touch a person or object in contact with the wire.',
      },
    ],
  },
  choking: {
    type: 'choking',
    title: 'CHOKING',
    steps: [
      {
        number: 1,
        instruction: 'Ask "Are you choking?" If they cannot speak, act now.',
        detail: 'If they can cough forcefully, encourage coughing. If they cannot speak, cough, or breathe, proceed immediately.',
        altGuidance: 'If the cough is weak or stops working, begin back blows and thrusts.',
      },
      {
        number: 2,
        instruction: 'Call 911 or have someone else call.',
        detail: 'Choking can become unconsciousness quickly. Get help moving while you assist.',
        altGuidance: 'If you are alone with the person, start rescue steps first, then call 911 as soon as you can.',
      },
      {
        number: 3,
        instruction: 'Give 5 back blows.',
        detail: 'Stand beside them, lean them forward, and strike firmly between the shoulder blades with the heel of your hand.',
        altGuidance: 'For a pregnant person or someone too large to reach around, use chest thrusts instead of abdominal thrusts.',
      },
      {
        number: 4,
        instruction: 'Give 5 abdominal thrusts.',
        detail: 'Stand behind them. Make a fist just above the navel, grasp it with your other hand, and pull sharply inward and upward 5 times.',
        altGuidance: 'For an infant under 1 year, use 5 back blows and 5 chest thrusts. Do not use abdominal thrusts on infants.',
      },
      {
        number: 5,
        instruction: 'Alternate back blows and thrusts until the object clears.',
        detail: 'If the person becomes unconscious, lower them to the floor, call 911 if not done, and begin CPR.',
        altGuidance: 'If you are alone and choking, thrust your upper abdomen against a hard chair back or counter edge.',
      },
    ],
  },
  fire: {
    type: 'fire',
    title: 'FIRE',
    steps: [
      {
        number: 1,
        instruction: 'Alert everyone and activate the fire alarm.',
        detail: 'Shout "Fire!" loudly. Pull the nearest alarm if there is one. Do not assume someone else has called.',
        altGuidance: 'If the alarm is broken or unavailable, go door to door only if it is safe and shout for people to evacuate.',
      },
      {
        number: 2,
        instruction: 'Call 911 and leave immediately.',
        detail: 'Do not use elevators. Take the nearest safe stairwell. Grab nothing except your phone.',
        altGuidance: 'If a stairwell is blocked by smoke, go to another exit. Move down and out, not up.',
      },
      {
        number: 3,
        instruction: 'Check doors before opening.',
        detail: 'Touch doors with the back of your hand. If hot, do not open. If cool, open slowly and stay low.',
        altGuidance: 'If all exits are blocked, seal gaps under doors with clothing, signal from a window, and wait for rescue.',
      },
      {
        number: 4,
        instruction: 'Stay low under smoke.',
        detail: 'Crawl if there is smoke. Cleaner air is near the floor. Cover your nose and mouth with cloth if available.',
        altGuidance: 'Use a wet cloth if you have one. Take short breaths through your nose.',
      },
      {
        number: 5,
        instruction: 'Meet outside and do not re-enter.',
        detail: 'Go to the evacuation meeting point. Account for people. Tell firefighters if anyone is missing.',
        altGuidance: 'If someone is trapped, tell firefighters where they are. Do not go back inside yourself.',
      },
    ],
  },
  chemical: {
    type: 'chemical',
    title: 'CHEMICAL EXPOSURE',
    steps: [
      {
        number: 1,
        instruction: 'Move away from the chemical immediately.',
        detail: 'Move upwind and uphill from the spill. Do not touch or inhale the substance. Keep others away.',
        altGuidance: 'If indoors and you cannot leave safely, seal the room, close vents, and wait for emergency instructions.',
      },
      {
        number: 2,
        instruction: 'Call 911 and report the chemical if known.',
        detail: 'Tell them the location, chemical name or placard number, how many people are exposed, and any symptoms.',
        altGuidance: 'If you cannot read the label, describe the container, color, smell, and visible markings from a safe distance.',
      },
      {
        number: 3,
        instruction: 'Remove contaminated clothing.',
        detail: 'Cut clothing off rather than pulling it over the head. Keep contaminated items away from people.',
        altGuidance: 'Avoid touching clothing with bare hands. Use gloves, bags, or another barrier if available.',
      },
      {
        number: 4,
        instruction: 'Flush exposed skin and eyes with water for 15 minutes.',
        detail: 'Use clean running water. For eyes, flush from the nose outward. Do not rub.',
        altGuidance: 'For dry powder chemicals, brush off excess first if safe, then flush with water.',
      },
      {
        number: 5,
        instruction: 'Keep the person warm and still until help arrives.',
        detail: 'Cover them if available. Do not give food or water unless emergency services instruct you to.',
        altGuidance: 'If they lose consciousness and are breathing, place them on their side and monitor breathing.',
      },
    ],
  },
  medical: {
    type: 'medical',
    title: 'MEDICAL RED FLAGS',
    steps: [
      {
        number: 1,
        instruction: 'Call 911 and describe what changed.',
        detail: 'Say the exact location first. Then say age, awake/not awake, breathing normally/not normally, and main symptom.',
        altGuidance: 'If symptoms are unclear, describe what you can see: skin color, speech, movement, breathing, and pain.',
      },
      {
        number: 2,
        instruction: 'Check awake and breathing.',
        detail: 'If not awake or not breathing normally, switch to the not-breathing guide and start CPR coaching.',
        altGuidance: 'If breathing but hard to wake, place on side if safe and keep watching breathing.',
      },
      {
        number: 3,
        instruction: 'Answer red-flag questions for dispatch.',
        detail: 'When did it start? Chest pain? Stroke signs? Seizure? Overdose? Diabetes? Pregnancy? Blood thinners? Severe headache? Trauma?',
        altGuidance: 'If you do not know, say unknown. Do not delay 911 to find paperwork.',
      },
      {
        number: 4,
        instruction: 'Keep them still and ready for EMS.',
        detail: 'Unlock the door, gather medications if nearby, and do not give food or drink unless dispatch says to.',
        altGuidance: 'If symptoms suddenly worsen, tell 911 immediately.',
      },
    ],
  },
};

export const UNKNOWN_EMERGENCY_PROTOCOL: EmergencyProtocol = {
  type: 'unknown',
  title: 'EMERGENCY',
  steps: [
    {
      number: 1,
      instruction: 'Call 911 immediately.',
      detail: 'Tell the operator your location and describe what you see. Stay on the line.',
    },
  ],
};

export function getEmergencyProtocol(type: EmergencyType): EmergencyProtocol {
  if (type === 'unknown') return UNKNOWN_EMERGENCY_PROTOCOL;
  return EMERGENCY_PROTOCOLS[type];
}
