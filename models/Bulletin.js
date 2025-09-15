const mongoose = require('mongoose');

const bulletinSchema = new mongoose.Schema({
    // Ward Information
    wardName: {
        type: String,
        required: true,
        default: 'Ward Name'
    },
    wardLocation: {
        type: String,
        required: true,
        default: 'Ward Location'
    },
    
    // Meeting Information
    meetingDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    meetingType: {
        type: String,
        required: true,
        default: 'Sacrament Meeting'
    },
    meetingTime: {
        type: String,
        required: false,
        default: '11:00 AM'
    },
    
    // Selected Image and Quote
    selectedImage: {
        url: String,
        caption: String
    },
    quote: {
        text: String,
        reference: String
    },
    
    // Leadership Roles
    presiding: {
        type: String,
        default: 'Bishop Name'
    },
    conducting: {
        type: String,
        default: 'Counselor Name'
    },
    organist: {
        type: String,
        default: 'Organist Name'
    },
    chorister: {
        type: String,
        default: 'Chorister Name'
    },
    
    // Program Items
    openingHymn: {
        number: {
            type: String,
            default: '001'
        },
        title: {
            type: String,
            default: 'Hymn Title'
        }
    },
    
    invocation: {
        type: String,
        default: 'By Invitation'
    },
    
    wardBusiness: {
        items: [{
            type: String
        }],
        display: {
            type: Boolean,
            default: false
        }
    },
    
    sacramentHymn: {
        number: {
            type: String,
            default: '169'
        },
        title: {
            type: String,
            default: 'As Now We Take the Sacrament'
        }
    },
    
    speakers: {
        first: {
            name: {
                type: String,
                default: 'Speaker Name'
            },
            topic: String
        },
        second: {
            name: {
                type: String,
                default: 'Speaker Name'
            },
            topic: String
        }
    },
    
    specialMusic: {
        performer: {
            type: String,
            default: 'Performer Name'
        },
        selection: String
    },
    
    closingHymn: {
        number: {
            type: String,
            default: '002'
        },
        title: {
            type: String,
            default: 'Hymn Title'
        }
    },
    
    benediction: {
        type: String,
        default: 'By Invitation'
    },
    
    comeFollowMe: {
        currentWeek: {
            date: String,
            scripture: String,
            title: String
        },
        nextWeek: {
            date: String,
            scripture: String,
            title: String
        },
        thirdWeek: {
            date: String,
            scripture: String,
            title: String
        }
    },
    
    announcements: {
        type: String,
        default: `September 14th: Family Heritage Follow-up Training! 7:00 in the Relief Society room.

September 27th: Western Night at Rod and Lisa Petersen's Barn.

Faith-based Addiction Recovery Program in person or on Zoom every Wednesday evening at 7:00 p.m. If you have questions, please call or text Sister Hawes (541) 510-4863 or email to: oregonfour@q.com.

Please follow these missionary pages for daily enlightenment and a way to share the gospel of Jesus Christ with your friends: Facebook-Followers of Christ in Southern Oregon | Instagram-hopeinhim.Southernoregon

Please help keep our Sister Missionaries fed! Sign up via the new digital calendar at missmeal.onrender.com to secure your spot!

General Conference Tickets! If you are interested in attending the October 2025 General Conference, please contact Ardel Wicks at ardelwicks@gmail.com or (541) 228-4136 to get tickets.

The Home Storage Center hours have changed! The update hours are on Thursdays from 12:00-5:00 and Saturdays from 10:00-1:00.

Got an announcement? Text Elise Luke at (541) 373-7908

Temple Prep Class: Those planning to attend the temple for the first time, please contact Whaanga (Fonga) Kewene at (541) 914-4104 or rwwkewene@gmail.com.

To Dine with the Missionaries: Contact Kelly Reynolds at (541) 514-8252 to set up an appointment.`
    },
    
    contactInformation: {
        type: String,
        default: `Bishop Ivan Walker (541) 579-4436
1st Counselor Jeff Krebs (541) 817-4150
2nd Counselor Jason Ryan (541) 373-1891
Executive Secretary Jesse Nelson (509) 607-4929
Ward Clerk Lowden Hansen (541) 514-7879
Financial Clerk Moroni Luke (541) 232-0324
Elders Quorum President Tony Moe (541) 321-2286
Relief Society President Marie Aylworth (541) 954-2327
Young Women President Kristan Johnston (801) 319-9993
Primary President Amy Poeschl (541) 852-3191
Temple & Family History David Freeman (541) 600-7803
Ward Building Rep Tim Heise (385) 239-9524
Music Chairman Patricia Skeen (541) 689-2190
Ward Mission Leader John Lancaster (208) 421-3179
Full-Time Missionaries Sister Missionaries (541) 232-1081
Elders (541) 285-5017`
    },
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    
}, {
    timestamps: true
});

// Index for finding current/active bulletins
bulletinSchema.index({ meetingDate: -1, isActive: 1 });

// Virtual for formatted date
bulletinSchema.virtual('formattedDate').get(function() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const date = new Date(this.meetingDate);
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dayNumber = date.getDate();
    const year = date.getFullYear();
    
    return `${dayName}, ${monthName} ${dayNumber}, ${year}`;
});

// Method to get current week's bulletin
bulletinSchema.statics.getCurrentBulletin = function() {
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
    
    const nextSunday = new Date(sunday);
    nextSunday.setDate(sunday.getDate() + 7);
    
    return this.findOne({
        meetingDate: {
            $gte: sunday,
            $lt: nextSunday
        },
        isActive: true
    });
};

// Method to create default bulletin for date
bulletinSchema.statics.createDefaultBulletin = function(date, userId) {
    return this.create({
        meetingDate: date,
        createdBy: userId
    });
};

module.exports = mongoose.model('Bulletin', bulletinSchema);
