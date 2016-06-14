
class: center, middle

# Micro-services with Finagle

---

#Twitter evolves

**2009**: Pure Ruby-on-Rails app with MySQL; lots of memcache. Materialized timelines into memcaches. Social graph moved to a service. Delayed work through queues

**2010**: Starting to move timelines out to its own serving system. Project godwit was started to move Twitter off ruby on rails. Work begins on shared serving infrastructure

**2011**: Infrastructure matures; a ton of work is being put into porting the application. TFE goes online

**2012**: TFE serves 100% of traffic all year; more and more of the API (by traffic) is being served off the new stack. Most new work happens there

**2015**: Last "Monorail" service was decomissioned in Dec 2015. TFE is still 100% based on micro-services

---

# Top concerns include

* Partial failures
* Deep memory hierarchies
* Changes in variance, latency tails
* Heterogeneous components
* Operator errors
* Hardware utilization

---

# Sources of concurrency in real world

* _The world as we know it_: clients are on their own, overlapping schedules
* _High-capacity systems_: efficient servers must handle 10,000s of requests simultaneously
* _Fan-out, fan-in coordination_: most servers are also clients

---

# Requirements

No silver bullets. We must _program locally_, _communicate globally_.

**Clean concurrent programming model**: simple, safe, and modular programs; uniform programming model.

**Message passing architecture**: High concurrency, fault tolerant, performant.

**Protocol support**: largely agnostic, support HTTP, thrift, memcache, redis, MySQL.

**Observability**: for diagnostics, profiling, optimization

---

# Disclaimer

I did not spent last 10 year researching all the
micro-services frameworks, so take if for what it's worth


Feel free to interrupt and ask your questions

---

# Everyone should understand

### [Fallacies of distributed computing](http://www.lasr.cs.ucla.edu/classes/188_winter15/readings/fallacies.pdf)
  * The network is reliable.
  * Latency is zero.
  * Bandwidth is infinite.
  * The network is secure.
  * Topology doesn't change.
  * There is one administrator.
  * Transport cost is zero.
  * The network is homogeneous.

### Tracing & Observability

In a distributed environment, standard tools loose their efficacy.

It is difficult to reason about what you cannot measure.

Debugging process interaction is vital.

---

class: center, middle

# Scala

![Scala](https://raw.githubusercontent.com/monifu/scala-best-practices/master/assets/scala-logo-256.png "Scala")

[shall we skip?](#12)

---

# Scala
We use Scala heavily for systems work.

* Hybrid FP/OO language
* Very expressive
* Statically typed with a rich type system
* Runs in the JVM
* Interoperates with Java

I’m going to introduce *just* enough of the language for you to grasp the following examples.

The point is *not* the language. The ideas and techniques matter. Scala happens to be our language.

---

# Values & Variables

        val i: Int = 123
        val s: String = "hello, world!"
        val f: Int => Int = { x => x*2 }
        f(123) == 246
        var z = 12
        z = 14

# Static typing with inference 

        val m = Map(
          0 -> "hello",
          1 -> "world"
        )

Here, the scala compiler *works for us*: we’re using integers and strings, so it must be a `Map[Int, String]`        

---

# Values are objects

        case class River(name: String, length: Int) { 
          def <(other: River) = length < other.length
        }

        val amazon = River("Amazon", 3977)
        val dnipro = River("Dnipro", 1423)

        dnipro < amazon == true
        amazon < dnipro == false

---

# Composition

In algebra we learned that two functions *g* and *f* compose: *h = g·f* which is shorthand for *h(x) = g(f(x))*

We can do the same in Scala! (pay attention to the types)

        val f: Int => String
        val g: String => Float
        val h: Int => Float = g compose f

g compose f is shorthand for

        val h = { x => g(f(x)) }

just like in algebra.

---

class: center, middle

![Finagle: an RPC system](http://twitter.github.io/finagle/guide/_images/logo_medium.png "finagle")

---

# Finagle: an RPC system

A crude recap:

 * Partial failures, message passing
 * Futures, Services
 * Finagle makes it possible
 * Servers consume services .

Adds behavior, largely configurable: load balancing, connection pooling, retrying, timeouts, rate limiting, monitoring, stats collection.

Protocol agnostic: codecs implement wire protocols.

Manages resources.

---

# Building blocks

  * Future

    just a read-only `Promise`, or single-event read-only `Observable`

  * Service
```
type Service[Req, Rep] = Req => Future[Rep]
```

  * Filter
```
abstract class Filter[-ReqIn, +RepOut, +ReqOut, -ReqIn] 
  extends (ReqIn, Service[ReqOut, RepIn]) => Future[RepOut]
```

  * Server

    Knows about the network, protocol, et.al.

---

# Future

Almost like `java.util.concurrent.Future`. 

Promise of a future result, where result could be a value or an error.

A placeholder for for a result that is, usually, being computed concurrently
  
  * long computations
  * network call
  * reading from disk

Computations can fail:

  * connection failure
  * timeout
  * div by zero, NullPointerException & Co

Futures are how we represent concurrent execution.

---

# Future

Are a kind of container:

```
trait Future[A]
```

It can be empty, full, or failed. You can wait for it:

```
val f: Future[A]
val result = f()
```

Failures would result in exceptions, prefer using Try:

```
f.get() match {
  case Return(res) => ...
  case Throw(exc) => ...
}
```

---

# Service
  
Does not now about network. As close to function as possible.

We’ve seen how we can use futures for concurrent programming, now we’ll see how network programming fits into the picture.

What is an RPC? 

 * Dispatch a request
 * Wait a while
 * Succeeds or fails

It’s a function!

```
type Service[Req, Rep] = Req => Future[Rep]
```

Servers implement these, clients make use of them.

---

# Filter
  
Many common behaviors of services are agnostic to the particulars of the service, i.e.

 * retries
 * timeouts
 * exception handling
 * stats

Filters compose over services. Conceptually, we want to alter the behavior of a service while being agnostic to what the service is.

Filter + Filter = Filter

Filter + Service = Service

![filters](https://g.twimg.com/blog/blog/image/finaglenetty2.png "finagle filters")

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

```
import com.twitter.finagle.{Http, Service}
import com.twitter.finagle.http.{Request, Response, Status}
import com.twitter.io.Charsets
import com.twitter.server.TwitterServer
import com.twitter.util.{Await, Future}

object BasicServer extends TwitterServer {
  val service = new Service[Request, Response] {
    def apply(request: Request) = {
      val response = Response(request.version, Status.Ok)
      response.contentString = "hola!"
      Future.value(response)
    }
  }

  def main() {
    val server = Http.serve(":8888", service)
    onExit {
      server.close()
    }
    Await.ready(server)
  }
}
```

---

#In practice: the good

Emphasizing declarative/data flow style programming with future combinators result in robust, modular, safe, and simple systems.

  * Most of our systems are big “Future transformers”: really only Finagle creates Promises.
  * This style of programming also encourages/enforces modularity.

It is simple to build higher level combinators.

  * eg.: generic hash-ring sharding, stats, speculative execution, custom load balancers - everything is uniform

Lots of implementor leeway.

  * Tracing, cancellation, thread-biasing pools, etc. with zero user code change

---

#In practice: the ugly

Some things don't fit so neatly: cancellation is hairy, for instance, but very important.

Clean separation is sometimes troublesome: eg. how to always retry a request on a **different** host?

Layering is never actually clean - the world is very messy.

Abstraction results in greater garbage collector pressure, but the JVM is very good.

---

# Contacts

@arsenkostenko

arsen.kostenko@gmail.com

![Shameless plug](http://www.reuk.co.uk/OtherImages/13-amp-plug.jpg "shameless  plug")

---

# References

 * [Thanks to Marius Ereksen!](https://monkey.org/~marius/talks/twittersystems)
 * [Notes on distributed systems](https://www.somethingsimilar.com/2013/01/14/notes-on-distributed-systems-for-young-bloods/)
 * [GRPC](http://www.grpc.io/)
 * [Finagle](http://twitter.github.io/finagle/)
 * [Twitter Server](http://twitter.github.io/twitter-server/)
 * [Finagle demo](https://www.youtube.com/watch?v=Ne0BkCtcJa8) [slides](http://www.slideshare.net/samkiller/high-performance-rpc-with-finagle)
 * [Finagle RPC Into](https://blog.twitter.com/2011/finagle-a-protocol-agnostic-rpc-system)
 * [Netty with Finagle](https://blog.twitter.com/2014/netty-at-twitter-with-finagle)
 * [How Twitter Works](https://docs.google.com/presentation/d/1XQ_4am9NlqMZQRVcgqbvFzsMkJroGeaoTsbwJSooohM/edit#slide=id.p)
 * [Mux](https://docbird.twitter.biz/finagle/Protocols.html#mux)
 * [Thrift Essentials](https://docbird.twitter.biz/twitter_stack/thrift_service_essentials.html)
