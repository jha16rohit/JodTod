# JODTOD_DESIGN_SPEC.md

## 1. Document Purpose

This document is a text-based representation of the JodTod mobile-app UI
specification contained in the supplied design-image ZIP.

It is intended to be consumed by a coding agent that cannot inspect the
original images.

The specification records the screens, states, dialogs/modals, bottom
sheets, workflows, actions, and navigation relationships visibly
represented in the supplied designs.

### Source material

The ZIP contains 12 image files. Two of the images are duplicates of the
same design sheet, so the source set contains 11 unique design sheets.

The design sheets are organized around these major product areas:

-   Authentication and onboarding
-   Home/dashboard
-   Groups/trips
-   Expenses
-   Receipt scanning and bill queue
-   Settlement
-   Activity
-   Notifications
-   Global search
-   People & settlements
-   Reports and final group closure
-   Profile and application settings
-   Offline/synchronization states

### Important interpretation rule

This document describes what is represented in the supplied designs. It
does not define backend implementation details that are not visible in
the designs.

Where a relationship is clearly implied by the UI flow, it is recorded
as a navigation/workflow relationship. Where the designs show an
alternative state rather than a separate route, it is explicitly marked
as a state/modal/sheet.

------------------------------------------------------------------------

# 2. Product-Level Navigation Model

The designs establish a primary mobile navigation structure:

``` text
Home
Groups
+
Activity
Settle
```

The central `+` action is a creation/action entry point rather than a
normal content tab.

The profile area is accessed separately through the profile/avatar area
and exposes account/settings functionality.

## Primary navigation

``` text
Home
 ├── Dashboard
 ├── Group summaries
 ├── Recent expenses
 └── Balance summaries

Groups
 ├── Group list
 ├── Create Group
 └── Group Details

+
 ├── Add Expense
 ├── Add Settlement
 ├── Add Member
 └── Scan Receipt
    └── Scan & Save to Queue

Activity
 ├── All
 ├── Expenses
 ├── Settlements
 ├── Members
 └── Group Updates

Settle
 ├── Group settlement overview
 ├── Settlement suggestions
 ├── Settle with person
 ├── Confirm payment
 └── Settlement history

Profile
 ├── Personal Information
 ├── Preferences
 ├── Linked Accounts
 ├── App Settings
 ├── Help & Support
 └── About JodTod
```

------------------------------------------------------------------------

# 3. Authentication and Onboarding

## AUTH-01 --- Splash Screen

### Purpose

Initial JodTod launch screen.

### Visible content

-   JodTod branding/logo
-   Minimal launch presentation

### State

-   Initial/loading state

### Navigation

``` text
App Launch
    ↓
Splash
    ↓
Onboarding or Login/Home depending on application state
```

The supplied design does not define the exact persisted-auth routing
logic; only the splash presentation is specified.

------------------------------------------------------------------------

## AUTH-02 --- Onboarding

### Purpose

Introduce the JodTod concept before authentication.

### Visible content

The design communicates:

-   Travel Together
-   Track Together
-   Manage group expenses
-   Settle easily
-   Focus on memories
-   JodTod branding
-   Tagline/message around splitting smart and travelling together

### Actions

-   Continue/next onboarding interaction
-   Skip

### Navigation

``` text
Onboarding
 ├── Continue → next onboarding content
 └── Skip → Login
```

------------------------------------------------------------------------

## AUTH-03 --- Login

### Purpose

Authenticate an existing user.

### Fields

-   Email / Phone number
-   Password

### Actions

-   Login
-   Forgot password
-   Continue with Google
-   Continue with Phone
-   Sign Up

### Navigation

``` text
Login
 ├── Login success → Home
 ├── Forgot password → Password recovery flow
 ├── Google → Google authentication
 ├── Phone → Phone authentication
 └── Sign Up → Signup
```

------------------------------------------------------------------------

## AUTH-04 --- Signup

### Purpose

Create a new JodTod account.

### Visible content

-   Email/phone-related account field
-   Password
-   Google signup/authentication
-   Phone signup/authentication
-   Link to Login

### Navigation

``` text
Signup
 ├── Account creation → verification/authentication flow
 ├── Google → Google authentication
 ├── Phone → Phone authentication
 └── Existing account → Login
```

The supplied design does not specify the exact verification-screen
layout in this image set.

------------------------------------------------------------------------

# 4. Home / Dashboard

## HOME-01 --- Home / Dashboard

### Purpose

Primary overview of the user's JodTod activity.

### Header

-   Greeting, e.g. "Good Night, Rohit"
-   Profile access

### Balance summary

-   You owe
-   You're owed

### Groups

Group cards display information such as: - Group/trip name - Member
count - Date range - Status - Balance information - View details

Example groups shown include: - Goa Trip - Manali Trip - College
Friends - Family Vacation

### Recent Expenses

Shows recent expenses with: - Expense title - Amount - Payer - Date -
Related group

### Quick actions

The dashboard exposes access to: - Add Expense - Scan Receipt - Add
Member - Other group/expense actions through `+`

### Navigation

``` text
Home
 ├── Group card → Group Details
 ├── Expense card → Expense Details
 ├── Add Expense → Add Expense flow
 ├── Scan Receipt → Receipt scanning
 ├── Profile → Profile
 ├── Groups → Groups
 ├── Activity → Activity
 └── Settle → Settle
```

------------------------------------------------------------------------

# 5. Add `+` Action System

## ACTION-01 --- Add Action Bottom Sheet

### Trigger

Tap the central `+` action.

### Bottom-sheet options represented in the designs

-   Add Expense
-   Scan Receipt
-   Add Member
-   Add Settlement
-   Scan Bill / Scan Receipt
-   Save scanned bill to queue

The exact option set varies between the provided design sheets, but the
central concept is a quick-action sheet.

### Navigation

``` text
+ Bottom Sheet
 ├── Add Expense → Add Expense Flow
 ├── Scan Receipt → Scan Receipt
 ├── Add Member → Member Invitation
 └── Add Settlement → Settlement flow
```

------------------------------------------------------------------------

# 6. Groups / Trips

## GROUP-01 --- Groups List

### Purpose

View and manage all trips/groups.

### Search

-   Search groups

### Filters/tabs

-   Active
-   Completed
-   Archived

### Group card information

-   Group name
-   Destination
-   Member count
-   Date range
-   Status
-   You owe / you're owed
-   Total expenses where applicable

### Example groups

-   Goa Trip
-   Manali Trip
-   Flatmates
-   College Friends

### Navigation

``` text
Groups
 ├── Search → Group search
 ├── Create Group → Create Group
 ├── Group card → Group Details
 └── Status filters → filtered group list
```

------------------------------------------------------------------------

## GROUP-02 --- Groups Empty State

### Purpose

Display when the user has no groups.

### Content

-   "No groups yet"
-   Explanation that the user can create the first trip or join an
    existing group
-   Create Group action

### Navigation

``` text
Empty Groups
 ├── Create a Group → Create Group
 └── Join existing group → invitation/join flow where applicable
```

------------------------------------------------------------------------

## GROUP-03 --- Create Group / Trip

### Purpose

Create a new trip/group.

### Fields

-   Cover image
-   Trip/group name
-   Destination
-   Description
-   Budget (optional)
-   Start date (optional)
-   End date (optional)

### Example

-   Trip Name: Goa Trip
-   Destination: Goa, India
-   Description: Beach, adventure and good vibes!
-   Budget: 50,000
-   Start Date
-   End Date

### Actions

-   Add Cover Image
-   Select dates
-   Continue/Create

### Navigation

``` text
Create Group
    ↓
Group Details / newly created group
```

------------------------------------------------------------------------

## GROUP-04 --- Group Details / Overview

### Purpose

Main workspace for one group.

### Header information

-   Group name
-   Destination
-   Status
-   Date range
-   Member count
-   Group description

### Balance summary

-   You're owed
-   You owe

### Main sections/actions

-   Expenses
-   Members
-   Budget
-   Reports
-   Group Settings
-   Settle

### Navigation

``` text
Group Details
 ├── Expenses → Group Expenses
 ├── Members → Group Members
 ├── Budget → Trip Budget
 ├── Reports → Reports & Analytics
 ├── Settle → Group Settlement
 └── Settings → Group Settings
```

------------------------------------------------------------------------

## GROUP-05 --- Group Members

### Purpose

View and manage members.

### Member information

-   Name
-   Email
-   Role
-   Joined date
-   Balance relationship where applicable

### Roles represented

-   Admin
-   Co-Admin
-   Member

### Actions

-   Invite members
-   Manage members
-   Change role
-   Member detail

### Navigation

``` text
Group Members
 ├── Invite → Invite Members
 ├── Member → Member Details / management
 └── Role management → role selection
```

------------------------------------------------------------------------

## GROUP-06 --- Role Management

### Purpose

Admin management of member roles.

### Roles shown

-   Admin
-   Co-Admin
-   Member

### State

Role-selection/control state.

### Navigation

``` text
Manage Members
    ↓
Select Member
    ↓
Role Management
```

------------------------------------------------------------------------

## GROUP-07 --- Invite Members

### Purpose

Invite people to a group.

### Invitation methods

-   Invite via link
-   Invite via QR code
-   WhatsApp
-   Gmail
-   Messages
-   More/share options

### Link

The designs show an invitation URL such as:

`https://jodtod.app/invite/abc123`

and another generated join link representation.

### Actions

-   Copy/share link
-   Show QR
-   Generate new link
-   Share through apps

### Navigation

``` text
Group
 ├── Members → Invite
 └── Group Settings → Invite
```

------------------------------------------------------------------------

## GROUP-08 --- Join Group via Link

### Purpose

Allow a user to join a group using an invitation.

### Visible state

Invitation card/message showing: - Inviter - Group/trip name - Group
information - Join/decline options

### Actions

-   Join
-   Decline

------------------------------------------------------------------------

## GROUP-09 --- Group Expenses

### Purpose

View all expenses belonging to a group.

### Views

-   By Day
-   By Category

### Expense row information

-   Expense title
-   Amount
-   Date
-   Payer
-   Number of participants

### Example expenses

-   Dinner at Bruno's
-   Movie Night
-   Hotel Stay
-   Fuel

### Navigation

``` text
Group Details
    ↓
Group Expenses
    ↓
Expense Details
```

------------------------------------------------------------------------

## GROUP-10 --- Group Settings

### Purpose

Manage group configuration.

### Options

-   Edit Trip Details
-   Manage Members
-   Budget Settings
-   Notification Preferences
-   Archive Group
-   Delete Group

### Navigation

``` text
Group Details
    ↓
Group Settings
```

------------------------------------------------------------------------

## GROUP-11 --- Edit Group

### Fields

Same core group information as creation: - Group name - Destination -
Description - Budget - Start date - End date - Cover image

### Action

Save/update group details.

------------------------------------------------------------------------

## GROUP-12 --- Archive Group

### Purpose

Move a group to archived status.

### Confirmation state

The design communicates that the group can be restored later.

### Navigation

``` text
Group Settings
    ↓
Archive confirmation
    ↓
Archived Group
```

------------------------------------------------------------------------

## GROUP-13 --- Delete Group

### Purpose

Permanently delete a group.

### Confirmation

The design explicitly warns that: - the group will be permanently
deleted - group data is affected - the action cannot be undone

### Actions

-   Delete Group
-   Cancel

------------------------------------------------------------------------

## GROUP-14 --- Member Leave Group

### Purpose

Allow a member to leave a group.

### Confirmation state

The design shows: - Leave Group - warning that the action cannot be
undone - expense/balance implications - Leave & Settle Now - Cancel

### Navigation

``` text
Group/member menu
    ↓
Leave Group
 ├── Leave & Settle Now
 └── Cancel
```

------------------------------------------------------------------------

# 7. Expenses

## EXP-01 --- Add Expense Bottom Sheet

### Trigger

Tap `+` → Add Expense.

### Options represented

-   Add Expense
-   Add Settlement
-   Add Member
-   Scan Receipt

### Purpose

Quickly initiate a transaction-related action.

------------------------------------------------------------------------

## EXP-02 --- Add Expense Details

### Fields

-   Group
-   Title
-   Amount
-   Paid by
-   Date & Time
-   Category
-   Split Method
-   Notes
-   Attach Bill (optional)

### Example

-   Group: Goa Trip
-   Title: Dinner at Bruno's
-   Amount: 2,850
-   Paid by: Rohit
-   Date: Apr 16, 2025
-   Category: Food & Drinks
-   Split: Equal Split

### Actions

-   Add Bill
-   Select payer
-   Select category
-   Select split method
-   Add expense
-   Cancel

------------------------------------------------------------------------

## EXP-03 --- Add Bill / Receipt Image

### Purpose

Attach a bill to an expense.

### Actions

-   Take Photo
-   Choose from Gallery
-   Skip/cancel

### State

Optional attachment.

------------------------------------------------------------------------

## EXP-04 --- Split Method Selection

### Methods represented

1.  Equal Split
2.  Unequal Split
3.  Percentage Split
4.  Item-wise Split
5.  Selective Split

### Equal Split

Split equally among selected members.

### Unequal Split

Set a custom amount for each person.

### Percentage Split

Set percentage for each participant.

### Item-wise Split

Assign individual bill items to members.

### Selective Split

Exclude some members from the expense.

------------------------------------------------------------------------

## EXP-05 --- Select Members

### Purpose

Choose which members participate in an expense.

### Visible information

-   Group members
-   Selection state
-   Equal split amount per person

### Example

-   4 members selected
-   ₹712.50 per person for a ₹2,850 expense

### Navigation

``` text
Split Method
    ↓
Select Members
    ↓
Split calculation
    ↓
Review Expense
```

------------------------------------------------------------------------

## EXP-06 --- Unequal Split

### Purpose

Specify custom amounts.

### Fields/state

-   Member list
-   Amount per member
-   Total validation

### Validation

The design includes split validation for invalid totals.

------------------------------------------------------------------------

## EXP-07 --- Percentage Split

### Purpose

Assign percentages to members.

### Validation

The supplied design explicitly shows:

> Total percentage cannot exceed 100%.

### Actions

-   Adjust percentages
-   Continue/cancel

------------------------------------------------------------------------

## EXP-08 --- Item-wise Split

### Purpose

Assign individual bill items to members.

### Content

-   Bill items
-   Item amount
-   Add/select members
-   Item assignment

### Example bill items

-   Pasta Alfredo
-   Margherita Pizza
-   Garlic Bread
-   Paneer Tikka
-   Fresh Lime Soda

------------------------------------------------------------------------

## EXP-09 --- Selective Split

### Purpose

Exclude some members from an expense.

### State

Only selected members participate.

------------------------------------------------------------------------

## EXP-10 --- Review Expense

### Purpose

Confirm the complete expense before saving.

### Displays

-   Title
-   Amount
-   Paid by
-   Date
-   Category
-   Split method
-   Participants
-   Per-person amount
-   Notes
-   Bill image

### Action

-   Confirm/Add Expense
-   Cancel/edit

------------------------------------------------------------------------

## EXP-11 --- Expense Added Success

### Purpose

Confirm successful creation.

### Message

The design communicates that the expense has been added to the selected
group.

### Navigation

``` text
Expense Added
 ├── View in Expense List
 └── Return to previous/group context
```

------------------------------------------------------------------------

## EXP-12 --- Expense Detail

### Purpose

View a saved expense.

### Displays

-   Title
-   Amount
-   Paid by
-   Category
-   Split type
-   Participants
-   Notes
-   Bill image
-   Date

### Actions

-   Edit
-   Delete
-   View bill

------------------------------------------------------------------------

## EXP-13 --- Edit Expense

### Purpose

Modify an existing expense.

### Editable information

-   Title
-   Amount
-   Date
-   Split method
-   Participants
-   Category
-   Payer
-   Notes
-   Bill

### Navigation

``` text
Expense Detail
    ↓
Edit Expense
    ↓
Save
    ↓
Expense Detail
```

------------------------------------------------------------------------

## EXP-14 --- Delete Expense Confirmation

### Purpose

Prevent accidental expense deletion.

### Confirmation

The design explicitly warns that deletion is permanent/cannot be undone.

### Actions

-   Delete
-   Cancel

------------------------------------------------------------------------

## EXP-15 --- Bill / Receipt Viewer

### Purpose

View the attached bill full-screen.

### Content

-   Full-screen bill/receipt image
-   Page indicator where applicable
-   Close/back

### Navigation

``` text
Expense Detail
    ↓
Bill Viewer
```

------------------------------------------------------------------------

## EXP-16 --- Split Validation Error

### Purpose

Show invalid split configuration.

### Example

-   Percentage total exceeds 100%
-   User must adjust values

### Actions

-   Edit Split
-   Cancel

------------------------------------------------------------------------

# 8. Receipt Scanning and OCR

## OCR-01 --- Scan Receipt

### Purpose

Capture a bill directly.

### Camera state

-   Receipt alignment frame
-   Capture action

### Action

-   Scan/capture receipt

------------------------------------------------------------------------

## OCR-02 --- Scan and Add Now

### Purpose

Scan a receipt and immediately continue into expense creation.

### Flow

``` text
Scan Receipt
    ↓
OCR/extraction
    ↓
Review extracted information
    ↓
Add Expense
```

------------------------------------------------------------------------

## OCR-03 --- Scan and Save to Queue

### Purpose

Scan a bill without immediately assigning it to a group.

### Success state

The design shows:

> Bill Saved to Queue!

and explains that the scanned bill can be added to a group later.

### Navigation

``` text
Scan Receipt
    ↓
Save to Queue
    ↓
Bill Queue
```

------------------------------------------------------------------------

## OCR-04 --- Bill Queue

### Purpose

Manage scanned bills waiting to be assigned.

### Tabs/states

-   To Add
-   Added

### Bill information

-   Bill title
-   Scan date
-   Image/thumbnail
-   Status

### Actions

-   Add to Group
-   Delete

------------------------------------------------------------------------

## OCR-05 --- Add From Queue

### Purpose

Take a queued bill and convert it into a group expense.

### Fields

-   Select Group
-   Title
-   Category
-   Split Method
-   Bill information

### Flow

``` text
Bill Queue
    ↓
Select Bill
    ↓
Add From Queue
    ↓
Select Group
    ↓
Expense Split
    ↓
Add Expense
```

------------------------------------------------------------------------

# 9. Settlement

## SET-01 --- Settle Main

### Purpose

View settlement obligations across groups.

### Group list

Examples: - Goa Trip - Flatmates - Manali Trip - College Friends

### Each group can show:

-   Pending/all settled state
-   Members
-   Overall balance
-   You owe
-   You're owed

### Navigation

``` text
Settle
 ├── Group → Group Settlement Overview
 └── Search groups
```

------------------------------------------------------------------------

## SET-02 --- Group Settlement Overview

### Purpose

Show balances inside one group.

### Information

-   Overall balance
-   Member balances
-   You owe
-   You're owed
-   Number of payments needed

### Navigation

``` text
Settle
    ↓
Group Settlement
```

------------------------------------------------------------------------

## SET-03 --- Settlement Suggestions

### Purpose

Optimize payments between members.

### Design concept

The system calculates a minimum/optimized set of transactions.

Example shown: - 3 transactions instead of 7 - Savings in unnecessary
payments

### Output

Who pays whom and how much.

------------------------------------------------------------------------

## SET-04 --- Settle With Person

### Purpose

Handle a specific bilateral balance.

### Information

-   Person name
-   Amount owed
-   Related trip
-   Payment history

### Payment methods

-   Mark as Paid
-   Paid outside the app
-   Pay via UPI (future)
-   Record Partial Payment

------------------------------------------------------------------------

## SET-05 --- Settlement Confirmation / Payment Details

### Fields

-   Amount
-   Date
-   Note
-   Payment method

### Example payment methods

-   Mark as Paid
-   Paid outside the app
-   UPI
-   Manual payment details

### Action

Confirm payment.

------------------------------------------------------------------------

## SET-06 --- Record Partial Payment

### Purpose

Record a custom amount rather than settling the full balance.

### Fields

-   Custom amount
-   Date
-   Note
-   Payment method

------------------------------------------------------------------------

## SET-07 --- Settlement Success

### Purpose

Confirm a payment was marked successfully.

### Message

The design communicates:

-   Payment marked
-   Balances updated

### Action

View group.

------------------------------------------------------------------------

## SET-08 --- All Settled State

### Purpose

Show that everyone in a group has settled.

### Message

The design presents a completion/celebratory state.

### Navigation

``` text
All Settled
    ↓
View Group
```

------------------------------------------------------------------------

## SET-09 --- Updated Balances

### Purpose

Display balances after a settlement.

### Content

-   Overall balance
-   Member balances
-   Settled/remaining states

------------------------------------------------------------------------

## SET-10 --- Settlement History

### Purpose

View historical settlement records.

### Information

-   Person
-   Amount
-   Date
-   Status
-   Direction
-   Payment details

### Example states

-   Marked as paid
-   Partial payment
-   Settled

------------------------------------------------------------------------

# 10. People & Settlements

## PEOPLE-01 --- People & Settlements

### Purpose

Provide a relationship-level view across trips.

### Main concepts

-   People/friends
-   Overall balance
-   Trips together
-   Amount owed
-   Amount they owe

### Search

Search people.

### Example

Aman: - 3 trips together - You owe - They owe you - Net balance

------------------------------------------------------------------------

## PEOPLE-02 --- Person Detail

### Purpose

View a specific person's relationship with the current user.

### Displays

-   Person information
-   Overall balance
-   Trips together
-   Trip-wise balances
-   Transaction history

### Navigation

``` text
People & Settlements
    ↓
Person
    ↓
Person Detail
```

------------------------------------------------------------------------

## PEOPLE-03 --- Trip-wise Breakdown

### Purpose

Break down the relationship by individual trips.

### Information

-   Trip name
-   Date range
-   Amount owed
-   Amount they owe
-   Settled state
-   Transactions

------------------------------------------------------------------------

## PEOPLE-04 --- Settle Up From People

### Purpose

Start a settlement directly from a person relationship.

### Navigation

``` text
People & Settlements
    ↓
Person
    ↓
Settle Up
```

------------------------------------------------------------------------

# 11. Activity

## ACT-01 --- Activity Main

### Purpose

View all recent application/group activity.

### Activity categories

-   Expenses
-   Settlements
-   Members
-   Group Updates

### Examples

-   Someone added an expense
-   Someone settled dues
-   Someone joined a group
-   Someone updated an expense
-   Someone invited a member

------------------------------------------------------------------------

## ACT-02 --- Filter Activity

### Filters

-   Activity type
-   Member
-   Group
-   Date range

### Date range options

-   All Time
-   Yesterday
-   Today
-   This Week
-   This Month
-   Custom Range

### Actions

-   Apply
-   Reset/clear filters

------------------------------------------------------------------------

## ACT-03 --- Expense Activity Detail

### Displays

-   Expense title
-   Amount
-   Date
-   Added by
-   Group
-   Category
-   Split type
-   Participants
-   Bill image
-   Description/notes

------------------------------------------------------------------------

## ACT-04 --- Settlement Activity Detail

### Displays

-   Settlement participants
-   Amount
-   Date
-   Group
-   Payment method
-   Settlement effect on balance

------------------------------------------------------------------------

## ACT-05 --- Member Activity Detail

### Displays

-   Member
-   Email
-   Group
-   Joined date
-   Inviter
-   Invitation relationship

------------------------------------------------------------------------

## ACT-06 --- Group Update Activity Detail

### Displays

-   Group
-   Change type
-   Previous/new information where applicable
-   Date/time

Examples: - Destination changed - Budget updated - Cover image changed -
Group name changed

------------------------------------------------------------------------

## ACT-07 --- Activity Empty State

### Purpose

Display when there is no activity.

### Message

The design communicates that group activities such as expenses,
settlements, and member updates will appear here.

------------------------------------------------------------------------

# 12. Notifications

## NOTIF-01 --- Notifications

### Purpose

View notifications separately from the activity feed.

### Examples

-   Expense added
-   Settlement completed
-   Group invitation
-   Budget alert
-   Report ready
-   Member joined

### Notification rows

Include: - Event summary - Related group/expense - Timestamp

------------------------------------------------------------------------

## NOTIF-02 --- Notification Detail

### Purpose

View complete notification context.

### Example

A notification can open related expense details or group information.

------------------------------------------------------------------------

# 13. Global Search

## SEARCH-01 --- Search

### Purpose

Search across JodTod data.

### Search categories

-   Groups
-   Members
-   Expenses

### Search input

`Search groups, expenses, members...`

### Recent searches

The design shows recent search entries with clear/remove controls.

### Quick filters

-   Expenses
-   Groups
-   Members

### Navigation

``` text
Search
 ├── Group result → Group
 ├── Member result → Person
 └── Expense result → Expense Detail
```

------------------------------------------------------------------------

# 14. Reports and Analytics

## REPORT-01 --- Trip Budget

### Purpose

Show spending against a group budget.

### Information

-   Total budget
-   Total spent
-   Remaining
-   Percentage used
-   Spending categories
-   Budget alert threshold

### Example

-   Budget: 250,000
-   Spending percentage
-   Remaining amount

### Actions

-   View Budget Details

------------------------------------------------------------------------

## REPORT-02 --- Reports & Analytics

### Purpose

Provide analytical summary of a group.

### Tabs

-   Overview
-   Category
-   Member

### Summary metrics

-   Total expenses
-   Total paid

Note: "You owe," "You're owed," "Members," and "Transactions" are not
shown on this screen — those metrics belong to the separate Final
Report Overview screen (see CLOSE-03).

### Charts/analytics represented

-   Daily spending
-   Category-wise spending
-   Food & Drinks
-   Stay
-   Transport
-   Activities
-   Shopping
-   Others

### Actions

-   View Full Report
-   Download PDF
-   Share Report

------------------------------------------------------------------------

## REPORT-03 --- Budget Alert

### Purpose

Notify user when spending approaches/exceeds a configured budget
threshold.

### Example

The design shows an alert around 80% budget usage.

### State

-   Current spending
-   Budget
-   Percentage used
-   View Budget Details

------------------------------------------------------------------------

# 15. Closing a Group / Final Report

## CLOSE-01 --- Close Group

### Purpose

Begin finalization of an active group.

### Information

-   Group name
-   Dates
-   Member count
-   Total expenses
-   Settlement status

### Warning

Closing: - locks expenses/members - generates a final report - prepares
final settlement information

### Preconditions shown

-   All expenses added
-   Members settled, optionally
-   Final summary reviewed

### Actions

-   Close Group
-   Cancel

------------------------------------------------------------------------

## CLOSE-02 --- Generating Report

### Purpose

Show report-generation progress.

### Progress stages shown

-   Analyzing expenses
-   Calculating balances
-   Optimizing settlements
-   Processing expenses
-   Generating PDF report

### Progress

The design shows a percentage/progress state.

------------------------------------------------------------------------

## CLOSE-03 --- Final Report Overview

### Purpose

Present the final group summary.

### Information

-   Group status
-   Total expenses
-   You paid
-   You owe
-   You're owed
-   Members
-   Settlement summary

------------------------------------------------------------------------

## CLOSE-04 --- Expense Breakdown

### Purpose

Final category-wise expense analysis.

### Categories

-   Food & Drinks
-   Stay
-   Transport
-   Activities
-   Shopping
-   Others

### Displays

-   Percentage
-   Amount

------------------------------------------------------------------------

## CLOSE-05 --- Member Summary

### Purpose

Show final financial summary per member.

### Columns/concepts

-   Member
-   Paid
-   Owed
-   Net

------------------------------------------------------------------------

## CLOSE-06 --- Settlement Plan

### Purpose

Present the optimized final settlement plan.

### Concept

Show minimum/optimized transactions.

Example: - 3 transactions instead of 7 - amount each person pays

------------------------------------------------------------------------

## CLOSE-07 --- Animated Settlement Flow

### Purpose

Visually show money moving between members.

### Content

The design shows a transaction-by-transaction flow.

Example:

``` text
Aman pays Rohit ₹2,450
Neha pays Rohit ₹1,200
Karan pays Rohit ₹980
```

### State

-   Transaction 1 of N
-   Progress through settlement flow

------------------------------------------------------------------------

## CLOSE-08 --- Final Report PDF Preview

### Purpose

Preview the final generated report before download/share.

### Information

-   Trip Report
-   PDF size
-   Group name
-   Trip dates
-   Summary
-   Member Summary
-   Settlement details

### Actions

-   Download PDF
-   Share Report

------------------------------------------------------------------------

## CLOSE-09 --- Share Report

### Share targets

-   WhatsApp
-   Gmail
-   Nearby Share
-   More

### Additional content

-   Share message
-   Copy Link

### Example share message

The design provides a pre-filled summary/message for the trip report.

------------------------------------------------------------------------

## CLOSE-10 --- Closed Group View

### Purpose

View a completed/archived group after closure.

### State

-   Archived
-   Completed
-   Expenses locked
-   Final report generated

### Message

The design explicitly communicates that: - all expenses are locked -
final report has been generated

------------------------------------------------------------------------

## CLOSE-11 --- Final Celebration

### Purpose

Celebrate completion of the group/trip lifecycle.

### Content

-   Trip Completed
-   Group successfully closed
-   Expenses settled
-   Thank-you/memory message
-   JodTod branding

### Navigation

``` text
Final Celebration
    ↓
Closed Group / Group Report
```

------------------------------------------------------------------------

# 16. Profile

## PROFILE-01 --- Profile Main

### Sections

#### Personal Information

-   Name
-   Email
-   Phone

#### Preferences

-   Currency
-   Theme
-   Notifications

#### Linked Accounts

-   Google
-   Phone
-   Apple/Facebook connection options shown in settings

#### App Settings

-   Language
-   Privacy
-   Data

#### Help & Support

-   FAQs
-   Contact Support

#### About

-   Version
-   About JodTod

#### Account actions

-   Log Out

------------------------------------------------------------------------

## PROFILE-02 --- Personal Information

### Fields

-   Full Name
-   Email
-   Username
-   Phone Number
-   Date of Birth
-   Bio

### Email/phone state

The design shows verified/connected states.

### Profile photo

-   Edit profile photo

------------------------------------------------------------------------

## PROFILE-03 --- Profile Photo Selection

### Options

-   Take Photo
-   Choose from Gallery
-   Remove Photo

### State

Photo-management bottom sheet/modal.

------------------------------------------------------------------------

# 17. Preferences

## PREF-01 --- Preferences

### Settings

-   Currency
-   Language
-   Date Format
-   Theme
-   Start of Week
-   Default Tab

### Example defaults shown

-   Currency: INR
-   Language: English
-   Date Format: Apr 16, 2025
-   Theme: System
-   Start of Week: Monday
-   Default Tab: Home

------------------------------------------------------------------------

## PREF-02 --- Currency Selection

### Search

Search currency.

### Currency options shown

-   Indian Rupee
-   US Dollar
-   Euro
-   British Pound
-   Australian Dollar
-   Canadian Dollar
-   Japanese Yen

### Interaction

Single selection.

------------------------------------------------------------------------

## PREF-03 --- Theme Selection

### Options

-   Light
-   Dark
-   System

### Descriptions

The designs show explanatory descriptions for the choices.

------------------------------------------------------------------------

## PREF-04 --- Language Selection

The designs expose language selection through the preferences/settings
area.

The supplied image clearly establishes language as an application
preference but does not define a complete language list.

------------------------------------------------------------------------

# 18. Linked Accounts

## ACCOUNT-01 --- Linked Accounts

### Connected accounts

-   Google
-   Phone number

### Additional account options

The designs also show: - Apple - Facebook

### Actions

-   Connect account
-   View connected/verified state

------------------------------------------------------------------------

# 19. App Settings

## SETTINGS-01 --- App Settings

### General

-   Currency
-   Language
-   Date Format
-   Start of Week
-   Default Tab

### Appearance

-   Theme
-   App Language

### Privacy & Security

-   App Lock
-   Biometric Login
-   Auto Logout

### Data

-   Clear Cache
-   Manage Offline Data
-   Sync Now

### Notifications

-   Expense Updates
-   Settlement Reminders
-   Group Invitations
-   Marketing Updates

### Account

-   Delete Account
-   Log Out

------------------------------------------------------------------------

## SETTINGS-02 --- App Lock

### Purpose

Secure the application.

### Options

-   None
-   PIN
-   Biometric

### Biometric options represented

-   Fingerprint
-   Face ID

------------------------------------------------------------------------

## SETTINGS-03 --- Auto Logout

### Purpose

Configure automatic logout.

### Example shown

-   After 30 days

------------------------------------------------------------------------

## SETTINGS-04 --- Clear Cache

### Purpose

Clear locally stored cache.

### State

Shows current cache size, e.g. `12.4MB`.

------------------------------------------------------------------------

## SETTINGS-05 --- Manage Offline Data

### Purpose

Manage locally stored offline information.

### Relationship

Connected to the offline/synchronization system.

------------------------------------------------------------------------

## SETTINGS-06 --- Sync Now

### Purpose

Manually initiate synchronization.

------------------------------------------------------------------------

# 20. Help & Support

## HELP-01 --- Help & Support

### Main options

-   FAQs
-   Contact Support
-   Report a Bug
-   Feature Request
-   How to Use JodTod

### Search

Search for help.

------------------------------------------------------------------------

## HELP-02 --- FAQ List

### Example questions

-   How do I create a group?
-   How do I add an expense?
-   How does settlement work?
-   Can I use the app offline?
-   Is my data safe?
-   How do I delete my account?

### Interaction

Tap a question to view its answer.

------------------------------------------------------------------------

## HELP-03 --- Contact Support

### Purpose

Contact JodTod support.

### State

Support/contact interface.

------------------------------------------------------------------------

## HELP-04 --- Report a Bug

### Purpose

Submit an application issue.

------------------------------------------------------------------------

## HELP-05 --- Feature Request

### Purpose

Suggest a new feature.

------------------------------------------------------------------------

## HELP-06 --- How to Use JodTod

### Purpose

Step-by-step usage guides.

------------------------------------------------------------------------

# 21. About JodTod

## ABOUT-01 --- About JodTod

### Information

-   JodTod name
-   Version 1.0.0 shown in the design
-   About the app
-   Terms of Service
-   Privacy Policy
-   Open Source Licenses
-   JodTod team attribution

### Branding/message

The design includes messaging around travel and shared experiences.

------------------------------------------------------------------------

# 22. Account Deletion

## ACCOUNT-DELETE-01 --- Delete Account

### Purpose

Permanently remove the user's account.

### Confirmation requirements

The design explicitly shows: - account deletion warning - statement that
deletion cannot be undone - requirement to type `DELETE`

### Confirmation input

``` text
DELETE
```

### Actions

-   Confirm deletion
-   Cancel

------------------------------------------------------------------------

# 23. Offline Mode and Synchronization

## OFFLINE-01 --- Offline Mode

### Purpose

Inform the user that the app is offline while allowing supported local
actions.

### Message

The design explicitly says:

> You're offline

### Pending operations shown

-   Expenses pending sync
-   Settlements pending sync
-   Receipt/queue item pending sync

### Example

-   3 expenses pending sync
-   1 settlement pending sync
-   1 receipt pending sync

------------------------------------------------------------------------

## OFFLINE-02 --- Offline Bill Queue

### Purpose

Persist scanned bills locally while offline.

### Relationship

``` text
Scan Receipt
    ↓
Save locally
    ↓
Bill Queue
    ↓
Sync when online
```

------------------------------------------------------------------------

## OFFLINE-03 --- Sync Conflict

### Purpose

Resolve conflicting local/server changes.

### Conflict message

The design communicates:

> We found a conflict

### Options

-   Use My Version
-   Use Server Version
-   Review Details
-   Ignore for now

### Relationship

``` text
Offline change
    ↓
Sync
    ↓
Conflict detected
    ↓
Conflict resolution
```

------------------------------------------------------------------------

# 24. Budget Alerts

## BUDGET-01 --- Budget Alert

### Purpose

Warn when group spending reaches a configured threshold.

### Example

-   80% of budget used
-   Amount spent
-   Total budget
-   View Budget Details

### Relationship

``` text
Expenses
    ↓
Budget calculation
    ↓
Threshold reached
    ↓
Budget Alert
```

------------------------------------------------------------------------

# 25. Report Filters

## REPORT-FILTER-01 --- Report Filters

### Purpose

Filter reports/analytics.

### Date range

-   All Time
-   From
-   To

### Group/category filters

The design shows: - All Groups - All Categories - Transaction Type - All
(Expenses + Settlements)

### Actions

-   Apply
-   Reset Filters

------------------------------------------------------------------------

# 26. Expense Edge-Case States

The design explicitly includes these states:

## EDGE-01 --- Invalid Split

Shows a validation error and asks the user to adjust values.

## EDGE-02 --- Delete Expense Confirmation

Requires confirmation before permanent deletion.

## EDGE-03 --- Full-Screen Bill

Full-screen bill/receipt viewer.

## EDGE-04 --- Leave Group Confirmation

Warns about leaving and offers settlement before leaving.

## EDGE-05 --- Invite/Join Group

Invitation state with join/decline actions.

------------------------------------------------------------------------

# 27. Group Lifecycle

The supplied designs establish this lifecycle:

``` text
Create Group
    ↓
Active Group
    ↓
Add Members
    ↓
Add Expenses
    ↓
Track Balances
    ↓
Settle
    ↓
Close Group
    ↓
Generate Final Report
    ↓
Final Settlement
    ↓
Trip Completed
    ↓
Archived/Closed Group
```

An active group exposes: - Expenses - Members - Budget - Reports -
Settlement - Settings

A closed group exposes: - Final report - Final settlement information -
Completed/archived status - Locked expense state

------------------------------------------------------------------------

# 28. Expense Lifecycle

``` text
Add Expense
    ↓
Enter Details
    ↓
Optional Bill
    ↓
Choose Split Method
    ↓
Select Members
    ↓
Review
    ↓
Add Expense
    ↓
Success
    ↓
Expense List / Expense Detail
```

Alternative OCR route:

``` text
Scan Receipt
    ↓
Extract/Review
    ├── Add Now
    │     ↓
    │   Expense Flow
    │
    └── Save to Queue
          ↓
        Bill Queue
          ↓
        Add to Group
          ↓
        Expense Flow
```

------------------------------------------------------------------------

# 29. Settlement Lifecycle

``` text
Settle
    ↓
Select Group
    ↓
View Overall Balance
    ↓
View Member Balances
    ↓
Settlement Suggestions
    ↓
Choose Person / Transaction
    ↓
Choose Payment Method
    ↓
Confirm Payment
    ↓
Updated Balances
    ↓
Settlement History
```

Alternative:

``` text
Person
    ↓
Settle Up
    ↓
Partial Payment
    ↓
Record Amount
    ↓
Updated Balance
```

------------------------------------------------------------------------

# 30. Final Closure Lifecycle

``` text
Active Group
    ↓
Close Group
    ↓
Confirmation
    ↓
Generating Report
    ↓
Trip Report
    ├── Expense Breakdown
    ├── Member Summary
    └── Settlement Plan
    ↓
Animated Settlement
    ↓
Final Report PDF
    ↓
Share / Download
    ↓
Trip Completed
    ↓
Closed / Archived Group
```

------------------------------------------------------------------------

# 31. Global Search Relationships

``` text
Global Search
 ├── Group result
 │      ↓
 │   Group Details
 │
 ├── Member result
 │      ↓
 │   People / Person Detail
 │
 └── Expense result
        ↓
     Expense Detail
```

------------------------------------------------------------------------

# 32. Activity Relationships

``` text
Activity
 ├── Expense event
 │      ↓
 │   Expense Activity Detail
 │
 ├── Settlement event
 │      ↓
 │   Settlement Activity Detail
 │
 ├── Member event
 │      ↓
 │   Member Activity Detail
 │
 └── Group update
        ↓
     Group Update Detail
```

------------------------------------------------------------------------

# 33. Profile Navigation Relationships

``` text
Profile
 ├── Personal Information
 │      └── Edit profile
 │
 ├── Preferences
 │      ├── Currency
 │      ├── Language
 │      ├── Date Format
 │      ├── Theme
 │      ├── Start of Week
 │      └── Default Tab
 │
 ├── Linked Accounts
 │      ├── Google
 │      ├── Phone
 │      ├── Apple
 │      └── Facebook
 │
 ├── App Settings
 │      ├── App Lock
 │      ├── Biometric Login
 │      ├── Auto Logout
 │      ├── Notifications
 │      ├── Clear Cache
 │      ├── Offline Data
 │      └── Sync Now
 │
 ├── Help & Support
 │      ├── FAQ
 │      ├── Contact
 │      ├── Bug Report
 │      ├── Feature Request
 │      └── How to Use
 │
 ├── About
 │
 ├── Delete Account
 │
 └── Log Out
```

------------------------------------------------------------------------

# 34. Bottom Sheets / Modals / Confirmation States

The supplied designs contain or imply the following overlays and
transient UI states.

  -----------------------------------------------------------------------------
  ID                Overlay           Trigger           Purpose
  ----------------- ----------------- ----------------- -----------------------
  SHEET-01          Add `+` action    Tap `+`           Choose action
                    sheet                               

  SHEET-02          Add Bill sheet    Attach bill       Choose camera/gallery

  SHEET-03          Split method      Select split      Choose split mode
                    selector                            

  SHEET-04          Member selector   Select            Choose participants
                                      participants      

  SHEET-05          Profile photo     Edit photo        Camera/gallery/remove
                    sheet                               

  SHEET-06          Theme selector    Theme setting     Light/dark/system

  SHEET-07          Currency selector Currency setting  Select currency

  MODAL-01          Delete Expense    Delete expense    Confirm deletion

  MODAL-02          Leave Group       Leave group       Confirm leave/settle

  MODAL-03          Delete Group      Delete group      Confirm permanent
                                                        deletion

  MODAL-04          Delete Account    Delete account    Confirm permanent
                                                        deletion

  MODAL-05          Archive Group     Archive group     Confirm archive

  MODAL-06          Split Validation  Invalid split     Correct split

  MODAL-07          Sync Conflict     Conflict detected Choose
                                                        local/server/review

  MODAL-08          Close Group       Close group       Confirm finalization
  -----------------------------------------------------------------------------

------------------------------------------------------------------------

# 35. Status and Empty States

The designs explicitly represent several non-happy-path states.

## Group states

-   Active
-   Completed
-   Archived
-   Empty groups

## Expense states

-   Normal
-   Invalid split
-   Pending/queued bill
-   Added successfully
-   Deleted confirmation

## Settlement states

-   Pending
-   Partial
-   Settled
-   All settled
-   Updated balance

## Activity states

-   Normal
-   Filtered
-   Empty activity

## Notification states

-   Recent notifications
-   Notification detail

## Offline states

-   Offline
-   Pending sync
-   Sync conflict
-   Synced

## Budget states

-   Normal
-   Threshold alert

## Group closure states

-   Active
-   Closing
-   Generating report
-   Completed
-   Archived/closed

------------------------------------------------------------------------

# 36. Design-Level Data Relationships

The UI consistently relates the following entities:

``` text
User
 │
 ├── Groups
 │     │
 │     ├── Members
 │     ├── Expenses
 │     │     ├── Bill
 │     │     └── Split
 │     │
 │     ├── Settlements
 │     ├── Budget
 │     ├── Activity
 │     └── Report
 │
 ├── People / Relationships
 │
 ├── Notifications
 │
 └── Preferences / Settings
```

An expense connects:

``` text
Expense
 ├── Group
 ├── Payer
 ├── Participants
 ├── Split Method
 ├── Category
 ├── Date/Time
 ├── Amount
 ├── Optional Bill
 └── Notes
```

A settlement connects:

``` text
Settlement
 ├── Group
 ├── Payer
 ├── Recipient
 ├── Amount
 ├── Date
 ├── Payment Method
 ├── Status
 └── Optional Note
```

------------------------------------------------------------------------

# 37. Design Terminology to Preserve

When auditing the implementation, preserve the terminology represented
by the supplied designs where practical:

-   Group / Trip
-   Expense
-   Bill / Receipt
-   Split
-   Equal Split
-   Unequal Split
-   Percentage Split
-   Item-wise Split
-   Selective Split
-   Settlement
-   Settle Up
-   You Owe
-   You're Owed
-   People & Settlements
-   Activity
-   Group Updates
-   Trip Report
-   Expense Breakdown
-   Member Summary
-   Settlement Plan
-   Offline Mode
-   Sync Conflict
-   Bill Queue
-   Active
-   Completed
-   Archived

------------------------------------------------------------------------

# 38. Design Audit Guidance for a Coding Agent

When comparing the actual JodTod frontend against this document:

### Mark `IMPLEMENTED` only when:

-   the screen/component exists
-   it has meaningful UI matching the specified function
-   the relevant actions are implemented
-   the screen is connected to the expected flow

### Mark `PARTIALLY IMPLEMENTED` when:

-   the screen exists but important sections/actions/states are missing
-   navigation exists but functionality is incomplete
-   only a subset of the designed workflow exists

### Mark `PLACEHOLDER` when:

-   the screen is mostly static/mock/demo UI
-   placeholder text is used instead of the intended functionality
-   buttons do not perform their represented action

### Mark `NOT IMPLEMENTED` when:

-   no meaningful implementation exists

### Mark `SHARED/DUPLICATE` when:

-   the design state is represented by an existing shared
    screen/component rather than requiring a separate route

Do not infer implementation from filenames alone.

------------------------------------------------------------------------

# 39. Primary End-to-End User Journeys

## Journey A --- New User

``` text
Splash
 ↓
Onboarding
 ↓
Signup
 ↓
Authentication/verification
 ↓
Home
```

## Journey B --- Existing User

``` text
Splash
 ↓
Login
 ↓
Home
```

## Journey C --- Create Trip

``` text
Home/Groups
 ↓
Create Group
 ↓
Enter trip details
 ↓
Create
 ↓
Group Details
 ↓
Invite Members
```

## Journey D --- Add Manual Expense

``` text
Group
 ↓
+
 ↓
Add Expense
 ↓
Expense Details
 ↓
Attach Bill (optional)
 ↓
Split Method
 ↓
Select Members
 ↓
Review
 ↓
Expense Added
 ↓
Expense List
```

## Journey E --- Scan and Add Expense

``` text
+
 ↓
Scan Receipt
 ↓
Capture
 ↓
Extract/Review
 ↓
Add Expense
 ↓
Split
 ↓
Review
 ↓
Expense Added
```

## Journey F --- Scan and Queue

``` text
+
 ↓
Scan Receipt
 ↓
Save to Queue
 ↓
Bill Queue
 ↓
Later select bill
 ↓
Add to Group
 ↓
Expense flow
```

## Journey G --- Settle

``` text
Settle
 ↓
Group
 ↓
Balances
 ↓
Settlement Suggestions
 ↓
Choose transaction
 ↓
Payment Method
 ↓
Confirm
 ↓
Success
 ↓
Updated Balances
```

## Journey H --- Close Trip

``` text
Group
 ↓
Close Group
 ↓
Confirm
 ↓
Generating Report
 ↓
Final Report
 ↓
Settlement Plan
 ↓
Settlement Flow
 ↓
Share/Download
 ↓
Trip Completed
 ↓
Closed Group
```

## Journey I --- Offline Expense

``` text
Offline
 ↓
Create/scan expense
 ↓
Store locally
 ↓
Pending Sync
 ↓
Connection restored
 ↓
Sync
 ├── Success
 └── Conflict
       ↓
     Resolve
```

------------------------------------------------------------------------

# 40. Visual Design Language

The supplied screens consistently use:

-   Light/white application surfaces
-   Green as the principal JodTod action/accent color
-   Dark/navy text
-   Rounded cards
-   Rounded buttons
-   Compact mobile cards
-   Avatar circles
-   Green success indicators
-   Red destructive actions/warnings
-   Bottom-sheet interaction patterns
-   Elevated central `+` action
-   Clear section headings
-   Status labels such as Active, Completed, Archived, Settled

The implementation audit should check for consistency with this visual
language but should not treat subjective pixel-level differences as
missing functionality.

------------------------------------------------------------------------

# 41. Source Sheet Coverage

## Sheet 01 --- Expense/Edge Cases

Contains: - Edit Expense - Delete Expense - Bill/Receipt Viewer - Split
Error/Validation - Join Group via Link - Leave Group - Role Management -
Offline Sync - Sync Conflict - Budget Alert - Report Filters - Delete
Account

## Sheet 02 --- Core Product / Authentication / Group / Reports

Contains: - Splash Screen - Onboarding - Login - Create Group/Trip -
Invite Members - Group Settings - Offline/Queue - Trip Budget - Reports
& Analytics - Final Settlement / Settlement Flow - Final Report -
Notifications - Global Search

## Sheet 03

Duplicate of Sheet 02.

## Sheet 04 --- Group Closure

Contains: - Group Details - Close Group - Generating Report - Final
Report Overview - Expense Breakdown - Member Summary - Settlement Plan -
Animated Settlement - Detailed Report/PDF Preview - Share Options -
Closed Group View - Final Celebration

## Sheet 05 --- People & Settlements

Contains: - Profile Menu - People & Settlements - Person Detail -
Trip-wise Breakdown - Settlement History - Settle Up - Home/Dashboard
relationship - Settle tab quick access

## Sheet 06 --- Profile and Settings

Contains: - Profile - Personal Information - Preferences - Linked
Accounts - App Settings - Help & Support - About JodTod - Profile photo
selection - Theme selection - Currency selection - App Lock - FAQ list

## Sheet 07 --- Home / Expense / Activity / Settle / Profile

Contains: - Home - Groups - `+` options - Add Expense - Scan Bill / Add
Now - Scan & Save to Queue - Bill Queue - Add from Queue - Split & Add -
Activity - Settle - Profile

## Sheet 08 --- Settlement

Contains: - Settle Main - Group Settlement Overview - Settlement
Suggestions - Settle Options - Confirm Settlement - Settlement Success -
Manual Settlement - All Settled - Updated Balances - Settlement History

## Sheet 09 --- Search / Notifications / Profile

Contains: - Search - Notifications - Notification Detail - Profile -
Expense Detail relationship

## Sheet 10 --- Add Expense Flow

Contains: - Add Expense bottom sheet - Expense Details - Add Bill
Image - Split Method - Select Members - Review & Add - Success - Expense
List - Unequal Split - Percentage Split - Item-wise Split

## Sheet 11 --- Activity

Contains: - Activity Main - Filter Activity - Expense Activity Detail -
Settlement Activity Detail - Member Activity Detail - Group Updates -
Empty Activity

## Sheet 12 --- Groups

Contains: - Groups List - Groups Empty State - Create Group - Group
Details - Group Members - Group Expenses - Group Settings - Invite
Members - Edit Group - Archive Group - Delete Group

------------------------------------------------------------------------

# 42. Final Design Inventory

The complete supplied design set covers the following functional areas:

``` text
Authentication
Onboarding
Home
Groups
Group creation
Group management
Members
Invitations
Roles
Expenses
Expense editing
Expense deletion
Bill attachments
Receipt scanning
OCR/queue
Split methods
Split validation
Settlement
Partial settlement
Settlement history
People relationships
Activity
Activity filtering
Notifications
Global search
Budget
Reports
Final report
PDF
Sharing
Group closure
Final celebration
Offline mode
Sync
Sync conflicts
Profile
Personal information
Preferences
Linked accounts
App settings
Security
Notifications settings
Offline data management
Help
FAQ
Support
About
Account deletion
Logout
```

This file is the **textual design reference** for the supplied JodTod UI
images. A coding agent can use it to audit the existing frontend without
needing direct access to the original image files.