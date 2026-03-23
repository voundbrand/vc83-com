Schritt: Teste mal ob das funktioniert:

Testzugang:
user:henjeson@gmail.com
pwd:Testzugang!


Client:
id: hub
secret: asldkj2384790saljkd8903lkjsad

https://auth.gruendungswerft.com/authorize/
https://auth.gruendungswerft.com/token/
https://auth.gruendungswerft.com/userinfo/

Discovery haben wir nicht hinterlegt, sag bescheid, wenn du es brauchst

Kein PKCE aktuell (aber denkbar - gerne Empfehlung)

Token Lifetime: Access: 1 Stunde,
Refresh: 30 Tage

Score „Basic“ liefert über userinfo:
{
  "id": "",
  "membership_id": "",
  "firstname": "",
  "lastname": "",
  "email": "",
  "street": "",
  "housenumber": "",
  "zip": "",
  "telephone": "",
  "city": "",
  "avatar": "", ///WP-Media-IDs!
  "socialmedia": [],
  "languages": [],
  "portrait": "" ///Kurzbeschreibung!
}
Achtung: Hier fehlen die Projekte und Startups der User, denen aber die BEnefits & usw. zugeordnet werden. Hier muss noch erweitert werden!

Schritt: Bugtesting und Finetuning