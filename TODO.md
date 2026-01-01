MOLLIE ONBOARDING

- Gaat 99% goed, na aanmaken account bij mollie wordt gebruiker doorgestuurd naar localhost, dat is niet OK

- De mollie status zou gepolled moeten worden, want na anmaken van nieuw mollie account is de status NEEDS_DATA

Pollen gebeurd al

MOLLIE FEE
excl, 0,32
incl, 0,3872

Ok hier het verhaal nog 1x:

Ik ben een platform, organisatoren verkopen tickets voor hun events via mijn platform.

Ik reken 35 cent per order + 2%

De organisator koppelt hun eigen Mollie account (betaalprovider).

De klant rekent een order af van 10 euro (ticket prijs incl btw).

Mijn fee voor deze order is 0,35 + 2% op het totaal bedrag, dus 0,55 cent. Ik moet hier over belasting betalen, maar dit wil ik doorbereken aan de klant. Dus ik breng 0,55/100\*21+0,55 = 0,6655 incl btw in rekening bij de klant.

Mollie rekent ook transactie kosten, deze zijn 32 cent excl btw, 0,3872 incl btw. Deze worden ook doorberekend aan de klant.

Het totaal order bedrag is nu 10+0,6655+0,3872 = 11,0527

Mijn fee van 0,6655 incl btw wordt tijdens de tranactie naar Mollie ingehouden en gaat naar mijn platform account, wat overblijft komt bij de organisators mollie account. Mollie brengt hun kosten direct bij de organisator in rekening.

Zo klopt het toch?
