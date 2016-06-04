#Micro-services with Finagle

---

#Twitter evolves

*2009*: Pure Ruby-on-Rails app with MySQL; lots of memcache. Materialized timelines into memcaches. Social graph moved to a service. Delayed work through queues.

*2010*: Starting to move timelines out to its own serving system. Project godwit was started to move Twitter off ruby on rails. Work begins on shared serving infrastructure.

*2011*: Infrastructure matures; a ton of work is being put into porting the application. TFE goes online.

*2012*: TFE serves 100% of traffic all year; more and more of the API (by traffic) is being served off the new stack. Most new work happens there.
This is the context of our work.

*2015*: Last "Monorail" service was decomissioned in Dec 2015. TFE is still 100% finagle service.

---

## On micro-services

 * allow fine-grained logic
 * allow gradual deployement
 * allow fault tolerance
 * allow scalability

---

## Disclaimer

I did not spent last 10 year researching the
micro-services frameworks, so take if for what it's worth

---

# Basic premise

Everyone should understand:

 * Fallacies of distributed computing
 * Tracing
 * Observability

---

# Ok just a recap
The fallacies are:

  * The network is reliable.
  * Latency is zero.
  * Bandwidth is infinite.
  * The network is secure.
  * Topology doesn't change.
  * There is one administrator.
  * Transport cost is zero.
  * The network is homogeneous.

---

# Building blocks

  * Service
```
type Service[Req, Rep] = Req => Future[Rep]
```

  * Filter
    ```
abstract class Filter[-ReqIn, +RepOut, +ReqOut, -ReqIn] 
  extends (ReqIn, Service[ReqOut, RepIn]) => Future[RepOut]
    ```

  * Future

    just a read-only `Promise`, or single-event read-only `Observable`

  * Server

    Knows about the network, protocol, et.al.

---

# Service
  
  Does not now about network. As close to function as possible.

---

# Filter
  
  Allows for sergive-generic functionality (logging, authentication, etc)

  A way to factor workflow into stages

  Allows to change not only content but alo content "type"

  Filter + Filter = Filter

  Filter + Service = Service

---

# Filter Example

```
class AuthFilter extends Filter[Creds, Seq[Post], User, Seq[Post]] {
  def authUser(creds: Creds): Future[User] = ...
  def apply(creds: Creds, svc: Service[User, Seq[Post]]): Future[Seq[Post]] = {
    authUser andThen svc
  }

}

class PostsService extends Service[User, Seq[Post]] {
  def apply(user: User): Future[Seq[Post]] = getPosts(user)
}

val auth = AuthFilter
val serv = PostsService
Thrift.serveIface(":9090", auth andThen serv)

```

---

# Future

  Almost like `java.util.concurrent.Future`. 

  Promise of a future result, where result could be a value or an error.

---

# Server Example

```
import com.twitter.finagle.http.{HttpMuxer, Request, Response}
import com.twitter.finagle.Http
import com.twitter.finagle.Service
import com.twitter.util.{Await, Future}
 
object HelloFinagle extends App {
 
  val hello = {
    new Service[Request, Response] {
      def apply(req: Request) = {
        val r = req.response
        r.setStatusCode(200)
        r.setContentTypeJson()
        r.setContentString("""{"hello": "world"}""")
        Future.value(r)
      }
    }
  }
 
  HttpMuxer.addRichHandler(f"/hello", hello)
  val server = Http.serve("0.0.0.0:8000", HttpMuxer)
  Await.ready(server)
}
```

---

# Twitter Server

Packed with features, production-ready server

 * Configuration flags
 * Logging
 * Shutdown hooks and commands
 * Service visibility (jvm/service stats, server info)

---

# Hola!

---

# Footnotes

 * [Notes on distributed systems](https://www.somethingsimilar.com/2013/01/14/notes-on-distributed-systems-for-young-bloods/)
 * [Fallacies of distributed computing](http://www.lasr.cs.ucla.edu/classes/188_winter15/readings/fallacies.pdf)
 * [GRPC](http://www.grpc.io/)

---

# References

 * [Finagle](http://twitter.github.io/finagle/)
 * [Twitter Server](http://twitter.github.io/twitter-server/)
 * [Finagle demo](https://www.youtube.com/watch?v=Ne0BkCtcJa8) [slides](http://www.slideshare.net/samkiller/high-performance-rpc-with-finagle)
 * [Finagle RPC Into](https://blog.twitter.com/2011/finagle-a-protocol-agnostic-rpc-system)
 * [Netty with Finagle](https://blog.twitter.com/2014/netty-at-twitter-with-finagle)
 * [How Twitter Works](https://docs.google.com/presentation/d/1XQ_4am9NlqMZQRVcgqbvFzsMkJroGeaoTsbwJSooohM/edit#slide=id.p)
 * [Mux](https://docbird.twitter.biz/finagle/Protocols.html#mux)
 * [Thrift Essentials](https://docbird.twitter.biz/twitter_stack/thrift_service_essentials.html)

---