/**
 * Provider survey: builds a Google Form + a results spreadsheet in one run.
 *
 * How to use (signed in to Google as shadowmodeco@gmail.com):
 *   1. Go to https://script.google.com -> New project.
 *   2. Delete the sample code, paste this whole file, click Save.
 *   3. Choose the function "createProviderSurvey" and click Run.
 *   4. Allow access when Google asks (it needs Forms + Sheets in YOUR Drive only).
 *   5. Open "Execution log": it prints the link to share, the edit link and the sheet link.
 * Running it again makes a second, separate form (it never changes an old one).
 *
 * Deliberately: no product name (it is a placeholder), never asks about patients,
 * and contact details are optional.
 */
function createProviderSurvey() {
  var form = FormApp.create('Prepaid visit packages: 5-minute practitioner survey');
  form.setDescription(
    'I am a practitioner building a simple tool that lets independent practices sell ' +
      'prepaid visit packages online. Clients get a QR pass on their phone, and your front ' +
      'desk scans it at each visit.\n\n' +
      'This survey takes about 5 minutes. Please do not include any client or patient ' +
      'information. Thank you!'
  );
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setConfirmationMessage(
    'Thank you! If you left your email, I may reach out about a free pilot. Nothing else.'
  );

  // ------------------------------------------------------------ 1. Your practice
  form.addSectionHeaderItem().setTitle('About your practice');

  form.addMultipleChoiceItem()
    .setTitle('What kind of practice is it?')
    .setChoiceValues([
      'Physician (incl. direct primary care)',
      'Chiropractic',
      'Physical / occupational therapy',
      'Mental health (therapist, counselor, psychologist)',
      'Massage therapy',
      'Acupuncture',
      'Nutrition / dietitian',
      'Yoga / Pilates studio',
      'Personal training / fitness',
      'Coaching',
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('How many practitioners (including you)?')
    .setChoiceValues(['Just me', '2-3', '4-10', 'More than 10'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Roughly how many client visits per week?')
    .setChoiceValues(['Under 20', '20-50', '51-100', '101-250', 'More than 250'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('About what share of your clients pay cash (self-pay, not insurance)?')
    .setChoiceValues(['All of them', 'Most (over 75%)', 'About half', 'Some (under 25%)', 'None'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Does your practice bill any insurance electronically, for any client?')
    .setHelpText('Including through a billing service or your practice software.')
    .setChoiceValues(['Yes', 'No', 'Not sure'])
    .setRequired(true);

  // ------------------------------------------------------------ 2. Today
  form.addPageBreakItem().setTitle('How you handle packages today');

  form.addMultipleChoiceItem()
    .setTitle('Do you offer prepaid visit packages or class packs now?')
    .setChoiceValues([
      'Yes',
      'No, but I have thought about it',
      'No, and I have not considered it',
      'I used to, but stopped',
    ])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('If you offer them (or did), how do you keep track of visits left?')
    .setChoiceValues([
      'Paper punch cards',
      'Spreadsheet',
      'My scheduling / practice software',
      'Memory / notes',
      'Not applicable',
    ])
    .showOtherOption(true);

  form.addCheckboxItem()
    .setTitle('What is annoying or goes wrong with packages? (pick any)')
    .setChoiceValues([
      'Tracking visits left takes staff time',
      'Clients dispute how many visits they have left',
      'Lost or forgotten punch cards',
      'Taking payment is awkward',
      'Expired packages and refunds',
      'Hard to promote packages',
      'Nothing really',
      'Not applicable',
    ])
    .showOtherOption(true);

  form.addParagraphTextItem()
    .setTitle('Why do (or don\'t) you offer packages? Anything else about how it works today?');

  form.addTextItem()
    .setTitle('Which scheduling or practice software do you use, if any?');

  // ------------------------------------------------------------ 3. The idea
  form.addPageBreakItem()
    .setTitle('The idea')
    .setHelpText(
      'You set up your packages (for example 5 visits for $360 instead of $400). Clients buy ' +
        'on your own branded page and pay by card; the money goes straight to your Stripe ' +
        'account. Clients can also choose to pay over time (for example with Klarna), while ' +
        'you are paid in full up front. They get a QR pass by email. At each visit you scan it, and it shows the ' +
        'visits left. Also: printable QR cards for clients without smartphones, flyers and ' +
        'counter signs with your QR code, refunds, and staff accounts.'
    );

  form.addScaleItem()
    .setTitle('How useful would this be for your practice?')
    .setBounds(1, 5)
    .setLabels('Not at all', 'Very useful')
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Which parts matter most to you? (pick up to 3)')
    .setChoiceValues([
      'Clients buy and pay online, without me',
      'Automatic visit tracking (no punch cards)',
      'Phone pass with QR code',
      'Printed QR cards for clients',
      'Self check-in screen at the front desk',
      'Clients can pay over time (e.g. Klarna)',
      'Flyers and signs to promote packages',
      'Seeing prepaid income and visits in one place',
    ])
    .setValidation(
      FormApp.createCheckboxValidation()
        .requireSelectAtMost(3)
        .setHelpText('Please pick up to 3.')
        .build()
    );

  form.addMultipleChoiceItem()
    .setTitle('At the front desk, how would you most likely check clients in?')
    .setChoiceValues([
      'Staff scan with a phone or tablet',
      'A USB desk scanner at the counter',
      'Clients check themselves in on a screen',
      'Not sure',
    ]);

  form.addParagraphTextItem()
    .setTitle('What would stop you from using it, or what is missing?');

  // ------------------------------------------------------------ 4. Price
  form.addPageBreakItem().setTitle('Price');

  form.addGridItem()
    .setTitle('How would each monthly price feel for this tool?')
    .setHelpText('Plus Stripe\'s normal card fee on each sale.')
    .setRows(['$29 / month', '$49 / month', '$79 / month'])
    .setColumns(['A bargain', 'Fair', 'Expensive, but I\'d consider it', 'Too much'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('We would also take 1% of each package sale. Is that acceptable?')
    .setChoiceValues(['Yes', 'Only with a lower monthly price', 'No'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Would you try it in a free 2-3 month pilot?')
    .setChoiceValues(['Yes', 'Maybe', 'No'])
    .setRequired(true);

  // ------------------------------------------------------------ 5. Contact (optional)
  form.addPageBreakItem()
    .setTitle('Stay in touch (optional)')
    .setHelpText('Only if you would like to hear about the pilot. Used for nothing else.');

  form.addTextItem().setTitle('Your name');
  form.addTextItem().setTitle('Practice name');
  form.addTextItem()
    .setTitle('Email')
    .setValidation(
      FormApp.createTextValidation()
        .requireTextIsEmail()
        .setHelpText('Please enter a valid email, or leave it blank.')
        .build()
    );

  // ------------------------------------------------------------ results sheet
  var sheet = SpreadsheetApp.create('Practitioner survey: responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  Logger.log('Share this link:  ' + form.getPublishedUrl());
  Logger.log('Edit the form:    ' + form.getEditUrl());
  Logger.log('Responses sheet:  ' + sheet.getUrl());
}
