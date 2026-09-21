/**
 * Design tokens extracted from Figma for Lost and Found screen
 *
 * Live frames: the list is
 * https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=3128-32
 * with the status popover at 3128-310 and its shipped variant at 3107-70.
 *
 * The node this file used to cite, `733-662`, **no longer exists** — the API
 * answers "node not found". It was the frame the first implementation was built
 * from, and it outlived the design. Citing a dead id is worse than citing none:
 * it reads as provenance and cannot be checked.
 */

/*
 * The scale comes from `@/utils/responsive`, not a local copy.
 *
 * This file used to declare its own `DESIGN_WIDTH = 440` and divide
 * `Dimensions.get('window')` by it — one of 31 such copies in the repo, and the
 * second of three inside this feature alone. Every copy is the same arithmetic
 * against the same 440pt frame, so they cannot disagree today; they can only
 * drift apart later, one file at a time, with nothing to catch it.
 *
 * Re-exported rather than importing at each call site, so the eleven files that
 * already read `scaleX` from here keep working unchanged.
 */
export { scaleX } from '@/utils/responsive';

// Colors
export const LOST_AND_FOUND_COLORS = {
  background: '#ffffff',
  headerBackground: '#e4eefe',
  cardBackground: '#f9fafc',
  cardBorder: '#e3e3e3',
  textPrimary: '#000000',
  textSecondary: '#1e1e1e',
  tabActive: '#5a759d',
  tabInactive: 'rgba(90,117,157,0.55)',
  statusStored: '#f0be1b',
  statusShipped: '#41d541',
  locationPin: '#f0be1b', // Yellow
  registerButton: '#ff46a3', // Pink
} as const;

// Registration Form Styles
export const REGISTER_FORM = {
  header: {
    height: 133,
    backgroundColor: '#e4eefe',
    backButton: {
      left: 27,
      top: 69,
      width: 14,
      height: 28,
    },
    title: {
      left: 68.99999809265137, // From Figma
      top: 69,
      fontSize: 24,
      fontWeight: 'bold' as const,
      color: '#607aa1',
    },
  },
  title: {
    left: 31, // From Figma: x=31
    top: 150,
    fontSize: 20,
    fontWeight: 'light' as const,
    color: '#607aa1',
  },
  stepIndicator: {
    left: 32, // From Figma: x=32
    top: 179,
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  progressBar: {
    left: 27, // From Figma: x=27
    top: 216,
    height: 6,
    width: 385, // Total width of all 3 bars
    activeColor: '#5a759d',
    inactiveColor: 'rgba(90,117,157,0.24)',
    bars: [
      { width: 122 }, // Step 1
      { width: 123 }, // Step 2
      { width: 122 }, // Step 3
    ],
  },
  dateTime: {
    label: {
      left: 27, // From Figma: x=27
      top: 248,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#000000',
    },
    dateInput: {
      left: 27, // From Figma: x=27
      top: 288,
      width: 196,
      height: 68,
      borderRadius: 8,
      borderColor: '#afa9ad',
      borderWidth: 1,
    },
    timeInput: {
      left: 237, // From Figma: x=237
      top: 288,
      width: 99,
      height: 68,
      borderRadius: 8,
      borderColor: '#afa9ad',
      borderWidth: 1,
    },
    dateText: {
      left: 42, // From Figma: x=42
      top: 313,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#5a759d',
    },
    timeText: {
      left: 267, // From Figma: x=267
      top: 313,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#5a759d',
    },
  },
  location: {
    label: {
      left: 26, // From Figma: x=26
      top: 382,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#000000',
    },
    roomOption: {
      left: 28, // From Figma: x=28
      top: 425,
      checkboxSize: 28,
      checkboxBorderColor: '#5a759d',
      checkboxBorderWidth: 2,
      textLeft: 66, // From Figma: x=66
      textTop: 430,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#5a759d',
    },
    publicAreaOption: {
      left: 130, // From Figma: x=130
      top: 425,
      checkboxSize: 28,
      checkboxBorderColor: '#5a759d',
      checkboxBorderWidth: 2,
      textLeft: 173, // From Figma: x=173
      textTop: 430,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#5a759d',
    },
  },
  roomNumber: {
    label: {
      left: 25, // From Figma: x=25
      top: 490,
      fontSize: 16,
      fontWeight: 'light' as const,
      color: '#000000',
    },
    selector: {
      left: 23, // From Figma: x=23
      top: 520,
      width: 394,
      height: 98,
      borderRadius: 8,
      borderColor: '#afa9ad',
      borderWidth: 1,
    },
    roomText: {
      left: 64, // From Figma: x=64
      top: 563,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#5a759d',
    },
    guestText: {
      left: 204, // From Figma: x=204
      top: 564,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#5a759d',
    },
    avatar: {
      left: 357, // From Figma: x=357
      top: 563,
      size: 26,
    },
    divider: {
      left: 188, // From Figma: x=188
      top: 546,
      width: 0,
      height: 54,
      color: '#5a759d',
    },
    badge: {
      left: 502, // From Figma: x=502
      top: 568.96,
      size: 20,
      backgroundColor: '#5a759d',
      textColor: '#f9fafc',
      fontSize: 12,
      fontWeight: 'bold' as const,
    },
  },
  pictures: {
    label: {
      left: 26, // From Figma: x=26
      top: 643.96,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#000000',
    },
    image1: {
      left: 26, // From Figma: x=26
      top: 680,
      width: 185,
      height: 158,
      borderRadius: 16,
    },
    image2: {
      left: 223, // From Figma: x=223
      top: 679.96,
      width: 183,
      height: 156,
      borderRadius: 11,
      backgroundColor: '#f2f2f2',
    },
    addIcon: {
      left: 295, // From Figma: x=295
      top: 726,
      width: 33,
      height: 32.832,
    },
  },
  notes: {
    labelContainer: {
      left: 28, // From Figma: x=28
      top: 875,
    },
    label: {
      left: 68.99999809265137, // From Figma: centered
      top: 883,
      fontSize: 18,
      fontWeight: 'bold' as const,
      color: '#000000',
    },
    icon: {
      left: 28, // From Figma: x=28
      top: 875,
      width: 31.9743595123291,
      height: 31.9743595123291,
    },
    text: {
      left: 30, // From Figma: x=30
      top: 957,
      fontSize: 14,
      fontWeight: 'light' as const,
      color: '#000000',
      width: 374,
    },
    divider: {
      left: 28, // From Figma: x=28
      top: 996,
      width: 378,
      height: 0,
      color: '#000000',
    },
  },
  nextButton: {
    left: 36, // From Figma: x=36
    top: 1122,
    width: 351,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#5a759d',
    text: {
      left: 193, // From Figma: x=193 (centered)
      top: 1146,
      fontSize: 18,
      fontWeight: 'regular' as const,
      color: '#ffffff',
    },
  },
  // Step 2 Styles
  step2: {
    foundedBy: {
      label: {
        fontSize: 14,
        fontWeight: 'light' as const,
        color: '#000000',
      },
      field: {
        width: 388,
        height: 68,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#afa9ad',
        paddingHorizontal: 20,
      },
      avatar: {
        size: 32,
      },
      name: {
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#5a759d',
      },
      searchIcon: {
        width: 19,
        height: 19,
      },
    },
    registeredBy: {
      label: {
        fontSize: 14,
        fontWeight: 'light' as const,
        color: '#000000',
      },
      field: {
        width: 388,
        height: 68,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#afa9ad',
        paddingHorizontal: 20,
      },
      avatar: {
        size: 32,
      },
      name: {
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#5a759d',
      },
      searchIcon: {
        width: 19,
        height: 19,
      },
    },
    status: {
      label: {
        fontSize: 14,
        fontWeight: 'light' as const,
        color: '#000000',
      },
      field: {
        width: 387,
        height: 68,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#afa9ad',
        paddingHorizontal: 20,
      },
      icon: {
        size: 27,
      },
      text: {
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#5a759d',
      },
      chevron: {
        width: 14,
        height: 7,
      },
    },
    storedLocation: {
      label: {
        fontSize: 14,
        fontWeight: 'light' as const,
        color: '#000000',
      },
      field: {
        width: 387,
        height: 68,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#afa9ad',
        paddingHorizontal: 20,
      },
      text: {
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#5a759d',
      },
      chevron: {
        width: 14,
        height: 7,
      },
    },
    staffSelector: {
      modal: {
        width: 394,
        maxHeight: 337,
        borderRadius: 8,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
      },
      header: {
        height: 50,
        paddingHorizontal: 18,
        title: {
          fontSize: 17,
          fontWeight: 'bold' as const,
          color: '#607aa1',
        },
        selectedCount: {
          fontSize: 14,
          fontWeight: 'light' as const,
          color: '#000000',
        },
        closeIcon: {
          width: 18,
          height: 18,
        },
      },
      divider: {
        height: 1,
        backgroundColor: '#e3e3e3',
      },
      listItem: {
        height: 60,
        paddingHorizontal: 18,
        paddingVertical: 14,
        avatar: {
          size: 32,
        },
        name: {
          fontSize: 16,
          fontWeight: 'bold' as const,
          color: '#1e1e1e',
        },
        department: {
          fontSize: 14,
          fontWeight: 'light' as const,
          color: '#000000',
        },
        meLabel: {
          fontSize: 11,
          fontWeight: 'regular' as const,
          color: '#5a759d',
        },
        checkmark: {
          fontSize: 18,
          color: '#5a759d',
        },
      },
      footer: {
        paddingVertical: 12,
        seeAll: {
          fontSize: 14,
          fontWeight: 'regular' as const,
          color: '#5a759d',
        },
      },
    },
    statusDropdown: {
      modal: {
        width: 387,
        maxHeight: 200,
        borderRadius: 8,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
      },
      item: {
        height: 60,
        paddingHorizontal: 20,
        paddingVertical: 16,
        icon: {
          size: 27,
        },
        text: {
          fontSize: 16,
          fontWeight: 'regular' as const,
          color: '#5a759d',
        },
        checkmark: {
          fontSize: 18,
          color: '#5a759d',
        },
      },
    },
    locationDropdown: {
      modal: {
        width: 387,
        maxHeight: 200,
        borderRadius: 8,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
      },
      item: {
        height: 60,
        paddingHorizontal: 20,
        paddingVertical: 16,
        text: {
          fontSize: 16,
          fontWeight: 'regular' as const,
          color: '#5a759d',
        },
        checkmark: {
          fontSize: 18,
          color: '#5a759d',
        },
      },
    },
  },
  step3: {
    itemImage: {
      width: 214,
      height: 140,
      borderRadius: 5,
      left: 29,
      top: 243,
    },
    itemDescription: {
      left: 36,
      top: 406,
      fontSize: 16,
      fontWeight: 'light' as const,
      color: '#000000',
      width: 262,
    },
    editIcon: {
      size: 28,
    },
    foundIn: {
      label: {
        left: 36,
        top: 466,
        fontSize: 16,
        fontWeight: 'bold' as const,
        color: '#000000',
      },
      checkbox: {
        left: 37,
        top: 507,
        size: 28,
      },
      guestInfo: {
        left: 40,
        top: 573,
      },
      guestName: {
        left: 84,
        top: 573,
        fontSize: 16,
        fontWeight: 'bold' as const,
        color: '#1e1e1e',
      },
      roomNumber: {
        left: 83,
        top: 593,
        fontSize: 14,
        fontWeight: 'light' as const,
        color: '#000000',
      },
    },
    emailCheckbox: {
      left: 45,
      top: 653,
      size: 28,
      textLeft: 84,
      textTop: 659,
      fontSize: 16,
      color: '#5a759d',
    },
    dateTime: {
      label: {
        left: 45,
        top: 731,
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#000000',
      },
      date: {
        left: 45,
        top: 763,
        fontSize: 16,
        color: '#5a759d',
      },
      time: {
        left: 202,
        top: 763,
        fontSize: 16,
        color: '#5a759d',
      },
    },
    foundedBy: {
      label: {
        left: 45,
        top: 821,
        fontSize: 16,
        fontWeight: 'bold' as const,
        color: '#000000',
      },
      avatar: {
        left: 46,
        top: 857,
        size: 32,
      },
      name: {
        left: 92,
        top: 857,
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#1e1e1e',
      },
      department: {
        left: 93,
        top: 876,
        fontSize: 14,
        fontWeight: 'light' as const,
        color: '#000000',
      },
    },
    registeredBy: {
      label: {
        left: 47,
        top: 927,
        fontSize: 16,
        fontWeight: 'bold' as const,
        color: '#000000',
      },
      avatar: {
        left: 45,
        top: 961,
        size: 32,
      },
      name: {
        left: 91,
        top: 961,
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#1e1e1e',
      },
      department: {
        left: 92,
        top: 980,
        fontSize: 14,
        fontWeight: 'light' as const,
        color: '#000000',
      },
    },
    status: {
      label: {
        left: 47,
        top: 1042,
        fontSize: 16,
        fontWeight: 'bold' as const,
        color: '#000000',
      },
      value: {
        left: 78,
        top: 1078,
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#5a759d',
      },
      icon: {
        left: 51,
        top: 1078,
        size: 18,
      },
    },
    storedLocation: {
      label: {
        left: 55,
        top: 1137,
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#000000',
      },
      value: {
        left: 56,
        top: 1161,
        fontSize: 16,
        fontWeight: 'bold' as const,
        color: '#1e1e1e',
      },
    },
    doneButton: {
      left: 44.5, // Centered: (440 - 351) / 2
      top: 1223,
      width: 351,
      height: 70,
      backgroundColor: '#5a759d',
      borderRadius: 0,
      fontSize: 18,
      fontWeight: 'regular' as const,
      color: '#ffffff',
    },
    divider: {
      height: 1,
      backgroundColor: '#c6c5c5',
    },
  },
} as const;

// Item Registered Success Screen
export const ITEM_REGISTERED_SUCCESS = {
      container: {
        width: 440,
        height: 956,
        backgroundColor: '#ffffff',
      },
      successIcon: {
        top: 242,
        left: 144,
        width: 151.24,
        height: 164.983,
      },
      checkmarkIcon: {
        top: 212,
        left: 194,
        width: 51.194,
        height: 39.818,
      },
      itemRegisteredText: {
        top: 435,
        fontSize: 19,
        fontWeight: 'regular' as const,
        color: '#5a759d',
      },
      trackingNumberLabel: {
        top: 514,
        fontSize: 24,
        fontWeight: 'bold' as const,
        color: '#607aa1',
      },
      trackingNumberValue: {
        top: 558,
        left: 144,
        // Slightly larger than original for better readability
        fontSize: 42,
        fontWeight: 'light' as const,
        color: '#000000',
      },
      instructionsText: {
        top: 622,
        fontSize: 16,
        fontWeight: 'light' as const,
        color: '#000000',
        width: 280,
      },
      printButton: {
        top: 723,
        width: 141,
        height: 55,
        borderRadius: 50,
        backgroundColor: 'rgba(100,131,176,0.4)',
      },
      printButtonText: {
        fontSize: 19,
        fontWeight: 'regular' as const,
        color: '#ffffff',
      },
      closeLink: {
        top: 856,
        fontSize: 18,
        fontWeight: 'regular' as const,
        color: '#5a759d',
      },
} as const;

