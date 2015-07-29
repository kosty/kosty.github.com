---
layout: post
title: HTTPS на Jetty 9 
category: hacks
tags: jetty https ssl tls
published: true
summary: Неllo world на HTTPS з Jetty 9
---

Основна дока про HTTPS на Jetty "[Configuring SSL/TLS](http://www.eclipse.org/jetty/documentation/current/configuring-ssl.html)"

Генеруємо ключ та запит на підпис сертифікату (Certificate Signing Reques, aka csr)

```
$ openssl genrsa -des3 -passout pass:x -out server.pass.key 2048
$ openssl rsa -passin pass:x -in server.pass.key -out server.key && rm server.pass.key
$ openssl req -new -key server.key -out server.csr
```

Остання команада просить ввесті деякі дані про компанію, що подає запит. Вводимо довільні дані. На запитання про "A challenge password" просто вводимо порожню стрічку.

Оскільки мова йде про мінімальний приклад - самі підписуєму запит і отримуємо сертифікат

```
$ openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt
```

Поєднуємо сертифікат і ключ в одну в'язку алгоритмом [pkcs12](https://en.wikipedia.org/wiki/PKCS_12)

```
$ openssl pkcs12 -inkey server.key -in server.crt -export -out server.pkcs12
Enter Export Password:
Verifying - Enter Export Password:
```

Замість паролю в даному випоадку я ввів просто `123456`. 

```
$ keytool -importkeystore -srckeystore server.pkcs12 -srcstoretype PKCS12 -destkeystore keystore
Enter destination keystore password:  
Re-enter new password: 
Enter source keystore password:  
Entry for alias 1 successfully imported.
Import command completed:  1 entries successfully imported, 0 entries failed or cancelled
```

Цього разу обрав пароль `qawsed`. А на запитання "Enter source keystore password:" ввів попередній пароль `123456`.

Щоб трохи ускладнити роботу гіпотетичним хацкерам, що неодмінно будуть шукати паролі в наших в'язках ключів проженемо паролі через "збивач з пантелику" (aka obfuscator)

```
$ java -cp ~/.m2/repository/org/eclipse/jetty/jetty-util/9.3.1.v20150714/jetty-util-9.3.1.v20150714.jar org.eclipse.jetty.util.security.Password 123456
2015-07-28 17:07:08.002:INFO::main: Logging initialized @104ms
123456
OBF:19iy19j019j219j419j619j8
MD5:e10adc3949ba59abbe56e057f20f883e
```

Отже замість `123456` використамо `OBF:19iy19j019j219j419j619j8`

```
$ java -cp ~/.m2/repository/org/eclipse/jetty/jetty-util/9.3.1.v20150714/jetty-util-9.3.1.v20150714.jar org.eclipse.jetty.util.security.Password qawsed
2015-07-28 17:07:17.202:INFO::main: Logging initialized @101ms
qawsed
OBF:1v9o1saj1zer1zej1sar1v8y
MD5:befe9f8a14346e3e52c762f333395796
```

Замість `qawsed` використаємо `OBF:1v9o1saj1zer1zej1sar1v8y`

Тепер подивимось як все це виглядає в java. Ось код класу `App.java`

```
$ cat ./src/main/java/org/httpssample/App.java 
package org.httpssample;

import org.eclipse.jetty.server.Connector;
import org.eclipse.jetty.server.HttpConfiguration;
import org.eclipse.jetty.server.HttpConnectionFactory;
import org.eclipse.jetty.server.SecureRequestCustomizer;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.ServerConnector;
import org.eclipse.jetty.server.SslConnectionFactory;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.eclipse.jetty.util.resource.Resource;
import org.eclipse.jetty.util.ssl.SslContextFactory;

public class App {
	
	public static void main(String... args) throws Exception{
        // Create a basic jetty server object without declaring the port.  Since we are configuring connectors
        // directly we'll be setting ports on those connectors.
        Server jettyServer = new Server();
        // HTTP Configuration
        // HttpConfiguration is a collection of configuration information appropriate for http and https. The default
        // scheme for http is <code>http</code> of course, as the default for secured http is <code>https</code> but
        // we show setting the scheme to show it can be done.  The port for secured communication is also set here.
        HttpConfiguration http_config = new HttpConfiguration();
        http_config.setSecureScheme("https");
        http_config.setSecurePort(8443);
        http_config.setOutputBufferSize(32768);

        // HTTP connector
        // The first server connector we create is the one for http, passing in the http configuration we configured
        // above so it can get things like the output buffer size, etc. We also set the port (8080) and configure an
        // idle timeout.
        ServerConnector http = new ServerConnector(jettyServer,new HttpConnectionFactory(http_config));        
        http.setPort(8080);
        http.setIdleTimeout(30000);
        
        // SSL Context Factory for HTTPS and SPDY
        // SSL requires a certificate so we configure a factory for ssl contents with information pointing to what
        // keystore the ssl connection needs to know about. Much more configuration is available the ssl context,
        // including things like choosing the particular certificate out of a keystore to be used.
        SslContextFactory sslContextFactory = new SslContextFactory();
        
		sslContextFactory.setKeyStoreResource(Resource.newClassPathResource("keystore"));
        sslContextFactory.setKeyStorePassword("OBF:1v9o1saj1zer1zej1sar1v8y");
        sslContextFactory.setKeyManagerPassword("OBF:19iy19j019j219j419j619j8");

        // HTTPS Configuration
        // A new HttpConfiguration object is needed for the next connector and you can pass the old one as an
        // argument to effectively clone the contents. On this HttpConfiguration object we add a
        // SecureRequestCustomizer which is how a new connector is able to resolve the https connection before
        // handing control over to the Jetty Server.
        HttpConfiguration https_config = new HttpConfiguration(http_config);
        https_config.addCustomizer(new SecureRequestCustomizer());

        // HTTPS connector
        // We create a second ServerConnector, passing in the http configuration we just made along with the
        // previously created ssl context factory. Next we set the port and a longer idle timeout.
        ServerConnector https = new ServerConnector(jettyServer,new SslConnectionFactory(sslContextFactory,"http/1.1"), new HttpConnectionFactory(https_config));
        https.setPort(8443);
        https.setIdleTimeout(500000);

        // Here you see the server having multiple connectors registered with it, now requests can flow into the server
        // from both http and https urls to their respective ports and be processed accordingly by jetty. A simple
        // handler is also registered with the server so the example has something to pass requests off to.
        jettyServer.setConnectors(new Connector[] { http, https });
        
        ServletContextHandler context = new ServletContextHandler(ServletContextHandler.SESSIONS);
        context.setContextPath("/");
        jettyServer.setHandler(context);
 
        ServletHolder jerseyServlet = context.addServlet(org.glassfish.jersey.servlet.ServletContainer.class, "/*");
        jerseyServlet.setInitOrder(0);
 
        // Tells the Jersey Servlet which REST service/class to load.
        jerseyServlet.setInitParameter("jersey.config.server.provider.classnames", EntryPoint.class.getCanonicalName());
 
        try {
            jettyServer.start();
            jettyServer.join();
        } finally {
            jettyServer.destroy();
        }
	}

}
```

Отже ми відкриваємо два порти `8080` для HTTP та `8443` для HTTPS. Just because we can. Сервлети конфігуруютсья через Jersey. Ось простенька реалізація `EntryPoint.java`

```
$ cat ./src/main/java/org/httpssample/EntryPoint.java 
package org.httpssample;

import java.util.HashMap;
import java.util.Map;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

@Path("/api")
public class EntryPoint {
	
	@GET
	@Path("entry")
	@Produces(MediaType.APPLICATION_JSON)
	public Map<String, String> getEntry(){
		
		Map<String, String> a = new HashMap<String, String>();
		a.put("id", "1");
		a.put("name", "entry");
		return a;
	}
	
}
```

Серіалізатори з POJO в JSON конфігуруются автомагічно через Jackson. Нажаль якщо передавати свої об'єкти, то доведеться дотримуватись спеки JavaBean, а конкретніше - писати `get` методи на кожен атрибут. Як альтернатива - можна написати свій адаптер/провайдер, про це розповідають [ось тут](http://stackoverflow.com/questions/11353790/serializer-for-hashmaps-for-jersey-use/11360732#11360732) 

Збирається проект просто

```
$ mvn clean package
```

Запустити теж

```
$ java -jar ./target/httpssample-0.0.1-SNAPSHOT-uberjar.jar 
```

Решту коду опубліковано [ось тут](https://github.com/kosty/httpssample)